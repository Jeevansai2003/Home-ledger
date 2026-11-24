import { describe, expect, it } from "vitest";
import {
  formatINR, isValidMonth, monthLabel, monthRange, shiftMonth,
} from "../../src/lib/format";

describe("formatINR", () => {
  it("shows rupees with Indian digit grouping", () => {
    expect(formatINR(0)).toContain("₹0");
    expect(formatINR(1234567)).toContain("12,34,567");
  });

  it("keeps paise only when needed", () => {
    expect(formatINR(500)).not.toContain(".");
    expect(formatINR(500.5)).toContain("500.5");
  });
});

describe("isValidMonth", () => {
  it("accepts YYYY-MM only", () => {
    expect(isValidMonth("2026-11")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-00")).toBe(false);
    expect(isValidMonth("2026-1")).toBe(false);
    expect(isValidMonth("abc")).toBe(false);
    expect(isValidMonth(undefined)).toBe(false);
  });
});

describe("shiftMonth", () => {
  it("moves forward and back across year ends", () => {
    expect(shiftMonth("2026-11", 1)).toBe("2026-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", -12)).toBe("2025-11");
  });
});

describe("monthRange", () => {
  it("covers exactly one month in UTC", () => {
    const { start, end } = monthRange("2026-11");
    expect(start.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});

describe("monthLabel", () => {
  it("writes the full month and year", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
  });
});
