type Entry = { count: number; resetAt: number };

// Kept on globalThis so it survives hot reloads in development.
const g = globalThis as unknown as { __rateLimitStore?: Map<string, Entry> };
const store = (g.__rateLimitStore ??= new Map<string, Entry>());

export function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const };
  }
  if (entry.count >= max) {
    return { ok: false as const, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true as const };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}