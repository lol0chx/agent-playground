import { neon, neonConfig } from '@neondatabase/serverless';

// Cache fetch() results between cold starts on the edge runtime.
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // We don't throw at import-time so the build doesn't break without env vars.
  // Routes that hit the DB check this themselves.
  // eslint-disable-next-line no-console
  console.warn('[db] DATABASE_URL is not set — database queries will fail.');
}

export const sql = neon(connectionString ?? '');

export type DocumentRow = {
  id: number;
  filename: string;
  uploaded_at: string;
  chunk_count?: number;
};

export type ChunkRow = {
  id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  similarity?: number;
  filename?: string;
};
