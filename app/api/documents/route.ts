import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { chunkText } from '@/lib/chunk';
import { embedTexts, toPgVector } from '@/lib/embeddings';
import { ipFromRequest, rateLimit } from '@/lib/rate-limit';

// Node runtime: pdf-parse depends on the `fs` and `Buffer` APIs and won't
// run on the edge. Upload throughput isn't latency-sensitive anyway.
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'text/markdown',
  'text/plain',
  'application/octet-stream', // some browsers send this for .md
]);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'md', 'txt', 'markdown']);

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    // Lazy-import so the edge bundle never tries to ship it.
    const { default: pdfParse } = await import('pdf-parse');
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buf);
    return parsed.text;
  }
  return await file.text();
}

interface DocRow {
  id: number;
  filename: string;
  uploaded_at: string;
  chunk_count: string | number;
}

export async function GET(): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not configured.' },
      { status: 500 },
    );
  }
  const rows = (await sql`
    SELECT
      d.id,
      d.filename,
      d.uploaded_at,
      COUNT(c.id) AS chunk_count
    FROM documents d
    LEFT JOIN chunks c ON c.document_id = d.id
    GROUP BY d.id
    ORDER BY d.uploaded_at DESC
  `) as DocRow[];

  return NextResponse.json({
    documents: rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      uploaded_at: r.uploaded_at,
      chunk_count: Number(r.chunk_count),
    })),
  });
}

export async function POST(req: Request): Promise<Response> {
  const ip = ipFromRequest(req);
  const limit = rateLimit(`upload:${ip}`, 5, 5);
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many uploads. Slow down a moment.' },
      { status: 429 },
    );
  }

  if (!process.env.DATABASE_URL || !process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Server is missing DATABASE_URL or OPENAI_API_KEY.' },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB).` },
      { status: 413 },
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: 'Only .pdf, .md, and .txt files are supported.' },
      { status: 415 },
    );
  }

  let text: string;
  try {
    text = await extractText(file);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to read file contents.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const chunks = chunkText(text, {
    chunkTokens: 500,
    overlapTokens: 50,
    maxChunks: 200,
  });

  if (chunks.length === 0) {
    return NextResponse.json(
      { error: 'No extractable text found in the file.' },
      { status: 400 },
    );
  }

  let vectors: number[][];
  try {
    vectors = await embedTexts(chunks);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Embedding request failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Insert in a single round trip: document + chunks. Neon doesn't expose
  // multi-statement transactions over the HTTP serverless driver, so we
  // create the doc first and rely on ON DELETE CASCADE for cleanup if
  // chunk insertion fails.
  const inserted = (await sql`
    INSERT INTO documents (filename) VALUES (${file.name}) RETURNING id
  `) as Array<{ id: number }>;

  const documentId = inserted[0]?.id;
  if (typeof documentId !== 'number') {
    return NextResponse.json(
      { error: 'Failed to create document row.' },
      { status: 500 },
    );
  }

  try {
    // Batched insert via UNNEST keeps this to a single round trip.
    const indexes = chunks.map((_, i) => i);
    const vectorLiterals = vectors.map(toPgVector);
    await sql`
      INSERT INTO chunks (document_id, chunk_index, content, embedding)
      SELECT ${documentId}, idx, content, emb::vector
      FROM UNNEST(
        ${indexes}::int[],
        ${chunks}::text[],
        ${vectorLiterals}::text[]
      ) AS t(idx, content, emb)
    `;
  } catch (err) {
    await sql`DELETE FROM documents WHERE id = ${documentId}`;
    const message =
      err instanceof Error ? err.message : 'Failed to insert chunks.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    id: documentId,
    filename: file.name,
    chunks: chunks.length,
  });
}
