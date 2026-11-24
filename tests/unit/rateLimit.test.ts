import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimit } from "../../src/lib/rateLimit";

let counter = 0;
const key = () => `test-${++counter}-${Math.random()}`;

describe("checkRateLimit", () => {
  afterEach(() => vi.useRealTimers());

  it("allows attempts up to the limit, then blocks", () => {
    const k = key();
    for (let i = 0; i < 3; i++) expect(checkRateLimit(k, 3, 60_000).ok).toBe(true);
    const blocked = checkRateLimit(k, 3, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("forgets old attempts once the window has passed", () => {
    vi.useFakeTimers();
    const k = key();
    for (let i = 0; i < 3; i++) checkRateLimit(k, 3, 1000);
    expect(checkRateLimit(k, 3, 1000).ok).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(checkRateLimit(k, 3, 1000).ok).toBe(true);
  });

  it("counts each key separately", () => {
    const a = key();
    const b = key();
    for (let i = 0; i < 2; i++) checkRateLimit(a, 2, 60_000);
    expect(checkRateLimit(a, 2, 60_000).ok).toBe(false);
    expect(checkRateLimit(b, 2, 60_000).ok).toBe(true);
  });

  it("can be reset after a successful login", () => {
    const k = key();
    for (let i = 0; i < 2; i++) checkRateLimit(k, 2, 60_000);
    expect(checkRateLimit(k, 2, 60_000).ok).toBe(false);
    resetRateLimit(k);
    expect(checkRateLimit(k, 2, 60_000).ok).toBe(true);
  });
});
