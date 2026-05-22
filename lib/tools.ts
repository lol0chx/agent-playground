import { tool } from 'ai';
import { z } from 'zod';
import { evaluate } from 'mathjs';
import { sql } from '@/lib/db';
import { embedQuery, toPgVector } from '@/lib/embeddings';
import {
  sanitizeExpression,
  sanitizeQuery,
  sanitizeTimezone,
} from '@/lib/sanitize';

export interface SearchDocsResult {
  hits: Array<{
    document_id: number;
    chunk_index: number;
    filename: string;
    content: string;
    similarity: number;
  }>;
}

export interface CalculateResult {
  expression: string;
  result: string;
}

export interface CurrentTimeResult {
  timezone: string;
  iso: string;
  formatted: string;
}

/**
 * Tools exposed to the model via the Vercel AI SDK.
 *
 * Keep argument schemas tight — Claude is generally well-behaved but the model
 * still occasionally drifts when the schema is permissive. Tight schemas also
 * mean cleaner, more deterministic UI rendering of tool calls.
 */
export const tools = {
  search_docs: tool({
    description:
      'Semantic search over the user\'s uploaded documents. Returns the top-k most relevant chunks with similarity scores. Use this when answering questions about specific docs the user has shared.',
    parameters: z.object({
      query: z
        .string()
        .min(1)
        .max(1000)
        .describe('A natural-language query to embed and search.'),
    }),
    execute: async ({ query }): Promise<SearchDocsResult> => {
      const clean = sanitizeQuery(query);
      const embedding = await embedQuery(clean);
      const vec = toPgVector(embedding);

      // pgvector cosine similarity. The `<=>` operator returns *distance*,
      // so 1 - distance gives a similarity score in [0, 1].
      const rows = (await sql`
        SELECT
          c.document_id,
          c.chunk_index,
          d.filename,
          c.content,
          1 - (c.embedding <=> ${vec}::vector) AS similarity
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        ORDER BY c.embedding <=> ${vec}::vector
        LIMIT 5
      `) as Array<{
        document_id: number;
        chunk_index: number;
        filename: string;
        content: string;
        similarity: number;
      }>;

      return { hits: rows };
    },
  }),

  get_current_time: tool({
    description:
      'Returns the current date and time, optionally in a specified IANA timezone (e.g. "America/Los_Angeles", "Europe/London"). Defaults to UTC.',
    parameters: z.object({
      timezone: z
        .string()
        .optional()
        .describe('An IANA timezone identifier. Defaults to UTC.'),
    }),
    execute: async ({ timezone }): Promise<CurrentTimeResult> => {
      const tz = sanitizeTimezone(timezone);
      const now = new Date();
      try {
        const formatted = new Intl.DateTimeFormat('en-US', {
          dateStyle: 'full',
          timeStyle: 'long',
          timeZone: tz,
        }).format(now);
        return { timezone: tz, iso: now.toISOString(), formatted };
      } catch {
        throw new Error(`Invalid timezone: ${tz}`);
      }
    },
  }),

  calculate: tool({
    description:
      'Evaluate a math expression safely. Supports +, -, *, /, %, ^, parentheses, and standard functions (sin, cos, sqrt, log, etc.). Returns the result as a string.',
    parameters: z.object({
      expression: z
        .string()
        .min(1)
        .max(256)
        .describe('A math expression like "2 * (3 + 4)" or "sqrt(144)".'),
    }),
    execute: async ({ expression }): Promise<CalculateResult> => {
      const clean = sanitizeExpression(expression);
      // mathjs evaluate() is sandboxed — no access to JS globals.
      const result = evaluate(clean);
      return { expression: clean, result: String(result) };
    },
  }),
} as const;

export type ToolName = keyof typeof tools;
