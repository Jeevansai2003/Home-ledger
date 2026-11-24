import { afterEach, describe, expect, it, vi } from "vitest";
import { addPeriod, daysUntil, dueLabel, dueTone, monthlyCost, todayIST } from "../../src/lib/bills";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

describe("addPeriod", () => {
  it("adds 7 days for weekly bills", () => {
    expect(iso(addPeriod(d("2026-11-18"), "WEEKLY"))).toBe("2026-11-25");
  });

  it("weekly crosses a year end", () => {
    expect(iso(addPeriod(d("2026-12-28"), "WEEKLY"))).toBe("2027-01-04");
  });

  it("monthly keeps the same day", () => {
    expect(iso(addPeriod(d("2026-11-15"), "MONTHLY"))).toBe("2026-12-15");
  });

  it("monthly rolls into the next year", () => {
    expect(iso(addPeriod(d("2026-12-15"), "MONTHLY"))).toBe("2027-01-15");
  });

  it("monthly clamps 31 Jan to the end of February", () => {
    expect(iso(addPeriod(d("2026-01-31"), "MONTHLY"))).toBe("2026-02-28");
    expect(iso(addPeriod(d("2028-01-31"), "MONTHLY"))).toBe("2028-02-29"); // leap year
  });

  it("monthly clamps 31 March to 30 April", () => {
    expect(iso(addPeriod(d("2026-03-31"), "MONTHLY"))).toBe("2026-04-30");
  });

  it("yearly keeps the same date", () => {
    expect(iso(addPeriod(d("2026-11-18"), "YEARLY"))).toBe("2027-11-18");
  });

  it("yearly moves 29 Feb to 28 Feb in a normal year", () => {
    expect(iso(addPeriod(d("2028-02-29"), "YEARLY"))).toBe("2029-02-28");
  });

  it("does not change the date it was given", () => {
    const original = d("2026-11-18");
    addPeriod(original, "MONTHLY");
    expect(iso(original)).toBe("2026-11-18");
  });
});

describe("todayIST and daysUntil", () => {
  afterEach(() => vi.useRealTimers());

  it("uses the India date, not the UTC date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T20:00:00Z")); // 01:30 on 18 Nov in India
    expect(todayIST()).toBe("2026-11-18");
  });

  it("counts whole days until a bill is due", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-18T10:00:00Z"));
    expect(daysUntil(d("2026-11-20"))).toBe(2);
    expect(daysUntil(d("2026-11-18"))).toBe(0);
    expect(daysUntil(d("2026-11-17"))).toBe(-1);
  });
});

describe("dueLabel and dueTone", () => {
  it("words the due date", () => {
    expect(dueLabel(-3)).toBe("Overdue by 3 days");
    expect(dueLabel(-1)).toBe("Overdue by 1 day");
    expect(dueLabel(0)).toBe("Due today");
    expect(dueLabel(1)).toBe("Due tomorrow");
    expect(dueLabel(5)).toBe("Due in 5 days");
  });

  it("colours urgency", () => {
    expect(dueTone(-1)).toBe("text-expense");
    expect(dueTone(2)).toBe("text-warn");
    expect(dueTone(10)).toBe("text-muted");
  });
});

describe("monthlyCost", () => {
  it("converts bills to a monthly amount", () => {
    expect(monthlyCost(500, "MONTHLY")).toBe(500);
    expect(monthlyCost(1200, "YEARLY")).toBe(100);
    expect(monthlyCost(100, "WEEKLY")).toBeCloseTo(433.33, 2);
  });
});
