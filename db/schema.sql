-- Foundry Agent Playground — database schema
-- Run against your Neon database (or any Postgres 15+ with pgvector available).
-- pgvector is preinstalled on Neon: https://neon.tech/docs/extensions/pgvector

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id          SERIAL PRIMARY KEY,
  filename    TEXT        NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chunks (
  id          SERIAL  PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content     TEXT    NOT NULL,
  embedding   vector(1536) NOT NULL
);

-- IVFFlat index for fast approximate cosine search.
-- `lists = 100` is fine for up to ~100k rows; tune higher if you scale.
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS chunks_document_id_idx
  ON chunks (document_id);
