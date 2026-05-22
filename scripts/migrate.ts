/**
 * Migration runner — executes db/schema.sql against $DATABASE_URL.
 * Idempotent because the schema uses CREATE ... IF NOT EXISTS.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { neon } from '@neondatabase/serverless';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const sql = neon(url);

  const here = dirname(fileURLToPath(import.meta.url));
  const schemaPath = join(here, '..', 'db', 'schema.sql');
  const ddl = await readFile(schemaPath, 'utf-8');

  // Neon's HTTP driver doesn't accept multiple statements per call, so
  // split on `;` after stripping comments. Naïve but works for our schema.
  const stripped = ddl
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  const statements = stripped
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    console.warn(`[migrate] ${stmt.split('\n')[0]}`);
    await sql(stmt);
  }
  console.warn('[migrate] Done.');
}

main().catch((err) => {
  console.error('[migrate] Failed:', err);
  process.exit(1);
});
