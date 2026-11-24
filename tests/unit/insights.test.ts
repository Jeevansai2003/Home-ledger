import { describe, expect, it } from "vitest";
import {
  change, daysInMonth, monthsBack, shortMonth, tone, valueAt,
} from "../../src/lib/insights";

describe("monthsBack", () => {
  it("lists months oldest first, ending with the given month", () => {
    expect(monthsBack(3, "2026-11")).toEqual(["2026-09", "2026-10", "2026-11"]);
  });

  it("crosses a year boundary", () => {
    expect(monthsBack(3, "2026-01")).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it("returns 12 months for a year", () => {
    const list = monthsBack(12, "2026-11");
    expect(list).toHaveLength(12);
    expect(list[0]).toBe("2025-12");
    expect(list[11]).toBe("2026-11");
  });
});

describe("daysInMonth", () => {
  it("knows month lengths and leap years", () => {
    expect(daysInMonth("2026-11")).toBe(30);
    expect(daysInMonth("2026-12")).toBe(31);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
  });
});

describe("change", () => {
  it("reports no change when both are zero", () => {
    expect(change(0, 0)).toEqual({ diff: 0, text: "No change" });
  });

  it("calls a first-time amount new", () => {
    expect(change(0, 500)).toEqual({ diff: 500, text: "New" });
  });

  it("shows percentage rises and falls", () => {
    expect(change(100, 150)).toEqual({ diff: 50, text: "+50%" });
    expect(change(200, 100)).toEqual({ diff: -100, text: "-50%" });
  });
});

describe("tone", () => {
  it("is green when the change is good and red when bad", () => {
    expect(tone(50, true)).toBe("text-income"); // more income
    expect(tone(50, false)).toBe("text-expense"); // more spending
    expect(tone(-50, false)).toBe("text-income"); // less spending
    expect(tone(-50, true)).toBe("text-expense"); // less income
    expect(tone(0, true)).toBe("text-muted");
  });
});

describe("valueAt", () => {
  const cumulative = [10, 20, null, null];

  it("returns the running total on a day", () => {
    expect(valueAt(cumulative, 1)).toBe(10);
    expect(valueAt(cumulative, 2)).toBe(20);
  });

  it("uses the last known value after the data ends", () => {
    expect(valueAt(cumulative, 4)).toBe(20);
    expect(valueAt(cumulative, 99)).toBe(20);
  });

  it("returns 0 when there is nothing", () => {
    expect(valueAt(cumulative, 0)).toBe(0);
    expect(valueAt([null, null], 2)).toBe(0);
  });
});

describe("shortMonth", () => {
  it("abbreviates the month name", () => {
    expect(shortMonth("2026-11")).toBe("Nov");
  });
});
