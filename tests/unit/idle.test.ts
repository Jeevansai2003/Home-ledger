import { describe, expect, it } from "vitest";
import {
  IDLE_LIMIT_MS, PING_EVERY_MS, SERVER_IDLE_LIMIT_MS, TOUCH_EVERY_MS, WARNING_MS,
} from "../../src/lib/idle";

// These guard the relationships between the timeout settings, so a later edit cannot
// quietly make the auto logout unreliable.
describe("inactivity settings", () => {
  it("the server waits at least one heartbeat longer than the browser", () => {
    expect(SERVER_IDLE_LIMIT_MS - IDLE_LIMIT_MS).toBeGreaterThanOrEqual(PING_EVERY_MS);
  });

  it("every heartbeat is allowed to update the stored activity time", () => {
    expect(TOUCH_EVERY_MS).toBeLessThan(PING_EVERY_MS);
  });

  it("the warning, if any, fits inside the idle limit", () => {
    expect(WARNING_MS).toBeGreaterThanOrEqual(0);
    expect(WARNING_MS).toBeLessThan(IDLE_LIMIT_MS);
  });

  it("the idle limit is the 5 minutes you asked for", () => {
    expect(IDLE_LIMIT_MS).toBe(5 * 60 * 1000);
  });
});
