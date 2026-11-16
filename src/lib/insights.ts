import { currentMonth, shiftMonth } from "./format";

export const RANGES = [3, 6, 12] as const;

// The last `count` months, oldest first, ending with the current month
export function monthsBack(count: number, from = currentMonth()) {
  return Array.from({ length: count }, (_, i) => shiftMonth(from, i - (count - 1)));
}

export const monthOf = (d: Date) => d.toISOString().slice(0, 7);

export function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export const shortMonth = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });

export const shortMonthYear = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });

// How much a value changed from a to b, as text
export function change(a: number, b: number) {
  const diff = b - a;
  if (a === 0 && b === 0) return { diff: 0, text: "No change" };
  if (a === 0) return { diff, text: "New" };
  const pct = Math.round((diff / a) * 100);
  return { diff, text: `${diff >= 0 ? "+" : ""}${pct}%` };
}

// Green when the change is good, red when it is bad
export function tone(diff: number, goodWhenUp: boolean) {
  if (diff === 0) return "text-muted";
  return (diff > 0) === goodWhenUp ? "text-income" : "text-expense";
}

// Running total value on a given day (last known value at or before that day)
export function valueAt(cumulative: (number | null)[], day: number) {
  for (let i = Math.min(day, cumulative.length) - 1; i >= 0; i--) {
    const v = cumulative[i];
    if (v !== null) return v;
  }
  return 0;
}