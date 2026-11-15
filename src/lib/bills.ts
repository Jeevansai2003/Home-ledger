export type Frequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export const FREQ_LABEL: Record<Frequency, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

// Today's date in India as YYYY-MM-DD
export function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

// Moves a due date forward by one period. Month-end safe (31 Jan -> 28 Feb).
export function addPeriod(date: Date, frequency: Frequency) {
  const d = new Date(date);
  if (frequency === "WEEKLY") {
    d.setUTCDate(d.getUTCDate() + 7);
    return d;
  }
  const months = frequency === "MONTHLY" ? 1 : 12;
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

// Whole days from today until the due date (negative = overdue)
export function daysUntil(due: Date) {
  const today = Date.parse(`${todayIST()}T00:00:00Z`);
  return Math.round((due.getTime() - today) / 86400000);
}

export function dueLabel(days: number) {
  if (days < 0) return `Overdue by ${-days} day${days === -1 ? "" : "s"}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export function dueTone(days: number) {
  if (days < 0) return "text-expense";
  if (days <= 3) return "text-warn";
  return "text-muted";
}

// Approximate monthly cost, for the "monthly commitments" total
export function monthlyCost(amount: number, frequency: Frequency) {
  if (frequency === "WEEKLY") return (amount * 52) / 12;
  if (frequency === "YEARLY") return amount / 12;
  return amount;
}

export const formatDue = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
