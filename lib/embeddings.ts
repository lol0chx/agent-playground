import { z } from 'zod';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

const embeddingResponseSchema = z.object({
  data: z.array(z.object({ embedding: z.array(z.number()) })),
});

/**
 * Embed an array of strings using OpenAI text-embedding-3-small.
 * Returns a 1536-dim float vector per input. Batched in groups of 96.
 */
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const batches: string[][] = [];
  for (let i = 0; i < inputs.length; i += 96) {
    batches.push(inputs.slice(i, i + 96));
  }

  const all: number[][] = [];
  for (const batch of batches) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI embeddings failed (${res.status}): ${text}`);
    }

    const parsed = embeddingResponseSchema.parse(await res.json());
    for (const item of parsed.data) {
      if (item.embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Unexpected embedding length: ${item.embedding.length}`,
        );
      }
      all.push(item.embedding);
    }
  }

  return all;
}

export async function embedQuery(query: string): Promise<number[]> {
  const [vec] = await embedTexts([query]);
  if (!vec) throw new Error('Failed to embed query');
  return vec;
}

/** Format a JS number[] as a pgvector literal: "[1.0,2.0,...]" */
export function toPgVector(v: number[]): string {
  return `[${v.join(',')}]`;
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
