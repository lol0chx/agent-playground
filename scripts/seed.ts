/**
 * Seed script — populates the documents/chunks tables with a few sample docs
 * so the demo works on first run.
 *
 * Usage:
 *   pnpm db:migrate   # apply db/schema.sql first (or run it via psql)
 *   pnpm db:seed
 *
 * Idempotent: documents are keyed by filename, so re-running this won't
 * duplicate rows.
 */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { neon } from '@neondatabase/serverless';

import { chunkText } from '../lib/chunk';
import { embedTexts, toPgVector } from '../lib/embeddings';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const here = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = join(here, 'sample-docs');

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set.');
  }
  const sql = neon(url);

  const files = await readdir(SAMPLES_DIR);
  const docs = files.filter((f) => /\.(md|txt)$/i.test(f));
  if (docs.length === 0) {
    console.warn('[seed] No sample docs found.');
    return;
  }

  for (const filename of docs) {
    const existing = (await sql`
      SELECT id FROM documents WHERE filename = ${filename} LIMIT 1
    `) as Array<{ id: number }>;
    if (existing.length > 0) {
      console.warn(`[seed] ${filename} already seeded — skipping.`);
      continue;
    }

    const text = await readFile(join(SAMPLES_DIR, filename), 'utf-8');
    const chunks = chunkText(text, {
      chunkTokens: 500,
      overlapTokens: 50,
      maxChunks: 200,
    });
    if (chunks.length === 0) {
      console.warn(`[seed] ${filename} produced no chunks — skipping.`);
      continue;
    }

    const vectors = await embedTexts(chunks);

    const inserted = (await sql`
      INSERT INTO documents (filename) VALUES (${filename}) RETURNING id
    `) as Array<{ id: number }>;
    const documentId = inserted[0]?.id;
    if (typeof documentId !== 'number') {
      throw new Error(`Failed to insert document row for ${filename}.`);
    }

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

    console.warn(`[seed] ${filename}: ${chunks.length} chunks indexed.`);
  }

  console.warn('[seed] Done.');
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
