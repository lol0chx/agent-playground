/**
 * Tiny in-memory token-bucket rate limiter, keyed by IP.
 *
 * Good enough for a single-region edge deployment with low traffic. For
 * multi-region you'd want @upstash/ratelimit backed by Upstash Redis — the
 * interface here mirrors that so swapping is a one-file change.
 */

interface Bucket {
  tokens: number;
  updated: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // ms until full refill
}

export function rateLimit(
  key: string,
  capacity = 10,
  refillPerMinute = 10,
): RateLimitResult {
  const now = Date.now();
  const refillRatePerMs = refillPerMinute / 60_000;

  const existing = buckets.get(key);
  const bucket: Bucket = existing ?? { tokens: capacity, updated: now };

  const elapsed = now - bucket.updated;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRatePerMs);
  bucket.updated = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    const reset = Math.ceil((1 - bucket.tokens) / refillRatePerMs);
    return { success: false, remaining: 0, reset };
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return {
    success: true,
    remaining: Math.floor(bucket.tokens),
    reset: Math.ceil((capacity - bucket.tokens) / refillRatePerMs),
  };
}

export function ipFromRequest(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0];
    if (first) return first.trim();
  }
  return req.headers.get('x-real-ip') ?? 'anonymous';
}
