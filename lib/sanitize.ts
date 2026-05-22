/**
 * Lightweight input sanitization for tool arguments.
 *
 * The model controls what flows into tools, but a stray prompt-injected
 * payload can still try to ask `calculate` to evaluate something dangerous
 * or `search_docs` to dump tens of thousands of characters. Belt + braces.
 */

const MAX_QUERY_LENGTH = 1_000;
const MAX_EXPRESSION_LENGTH = 256;

export function sanitizeQuery(input: unknown): string {
  if (typeof input !== 'string') throw new Error('query must be a string');
  const trimmed = input.trim();
  if (trimmed.length === 0) throw new Error('query is empty');
  if (trimmed.length > MAX_QUERY_LENGTH) {
    throw new Error(`query exceeds ${MAX_QUERY_LENGTH} characters`);
  }
  return trimmed;
}

const ALLOWED_EXPR = /^[\s0-9+\-*/().,%^!a-zA-Z]+$/;

export function sanitizeExpression(input: unknown): string {
  if (typeof input !== 'string') throw new Error('expression must be a string');
  const trimmed = input.trim();
  if (trimmed.length === 0) throw new Error('expression is empty');
  if (trimmed.length > MAX_EXPRESSION_LENGTH) {
    throw new Error(`expression exceeds ${MAX_EXPRESSION_LENGTH} characters`);
  }
  if (!ALLOWED_EXPR.test(trimmed)) {
    throw new Error('expression contains disallowed characters');
  }
  if (/[:=]/.test(trimmed) && !/<=|>=|==|!=/.test(trimmed)) {
    throw new Error('assignment is not allowed in expressions');
  }
  return trimmed;
}

export function sanitizeTimezone(input: unknown): string {
  if (input === undefined || input === null || input === '') return 'UTC';
  if (typeof input !== 'string') throw new Error('timezone must be a string');
  if (!/^[A-Za-z0-9_+\-/]+$/.test(input)) {
    throw new Error('timezone contains disallowed characters');
  }
  return input;
}
