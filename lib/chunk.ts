/**
 * Rough token-based text chunker.
 *
 * We avoid pulling in a real tokenizer (tiktoken/transformers) to keep the
 * bundle slim and the edge runtime happy. The 1-token ~ 4-character heuristic
 * is good enough for English-language docs and is the same approximation
 * OpenAI cites in their cookbook.
 */

const CHARS_PER_TOKEN = 4;

export interface ChunkOptions {
  chunkTokens?: number; // target chunk size in tokens (default 500)
  overlapTokens?: number; // overlap between adjacent chunks (default 50)
  maxChunks?: number; // hard cap to control cost/size (default 200)
}

export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const chunkTokens = opts.chunkTokens ?? 500;
  const overlapTokens = opts.overlapTokens ?? 50;
  const maxChunks = opts.maxChunks ?? 200;

  const chunkChars = chunkTokens * CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;
  const stride = Math.max(1, chunkChars - overlapChars);

  const cleaned = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (cleaned.length === 0) return [];

  const chunks: string[] = [];
  for (let i = 0; i < cleaned.length; i += stride) {
    const slice = cleaned.slice(i, i + chunkChars).trim();
    if (slice.length > 0) chunks.push(slice);
    if (chunks.length >= maxChunks) break;
    if (i + chunkChars >= cleaned.length) break;
  }
  return chunks;
}
