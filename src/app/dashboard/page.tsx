import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR, formatShortDate } from "@/lib/format";
import CopyButton from "@/components/CopyButton";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const user = await requireUser();
  const householdId = user.householdId;

  const month = new Date().toISOString().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00Z`);
  const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const inMonth = { householdId, date: { gte: start, lt: next } };

  const [totals, byCategory, recent, categories, members] = await Promise.all([
    prisma.transaction.groupBy({ by: ["type"], where: inMonth, _sum: { amount: true } }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { ...inMonth, type: "EXPENSE" },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: { householdId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: { category: true, user: true },
    }),
    prisma.category.findMany({ where: { householdId } }),
    prisma.user.findMany({
      where: { householdId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  const income = Number(totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0);
  const expense = Number(totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0);
  const left = income - expense;
  const kept = income > 0 ? Math.round((left / income) * 100) : null;
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const monthLabel = start.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
  );
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.name.split(" ")[0];

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-muted">Here is how {user.household.name} is doing in {monthLabel}.</p>
        </div>
        <Link href="/transactions" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" />
          Add transaction
        </Link>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Monthly statement */}
          <section className="card overflow-hidden" aria-labelledby="statement-heading">
            <h2 id="statement-heading" className="px-5 pt-5 text-base font-semibold">
              {monthLabel}
            </h2>
            <dl className="mt-3">
              <div className="flex items-center justify-between border-t border-line px-5 py-3.5">
                <dt className="text-sm text-muted">Income</dt>
                <dd className="num font-medium text-income">+{formatINR(income)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line px-5 py-3.5">
                <dt className="text-sm text-muted">Expenses</dt>
                <dd className="num font-medium text-expense">-{formatINR(expense)}</dd>
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-line bg-canvas px-5 py-5">
                <div>
                  <dt className="text-sm font-medium">Left this month</dt>
                  {kept !== null && (
                    <p className="mt-0.5 text-xs text-muted">
                      {kept >= 0 ? `You kept ${kept}% of your income` : "Spending is above income"}
                    </p>
                  )}
                </div>
                <dd
                  className={`num font-display text-3xl font-semibold ${
                    left >= 0 ? "text-income" : "text-expense"
                  }`}
                >
                  {formatINR(left)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Recent activity */}
          <section className="card" aria-labelledby="recent-heading">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 id="recent-heading" className="text-base font-semibold">Recent activity</h2>
              <Link href="/transactions" className="text-sm font-medium text-brand hover:underline">
                View all
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="px-5 pb-8 pt-6 text-center">
                <p className="font-medium">No transactions yet</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                  Add your first expense or income and it will show up here.
                </p>
                <Link href="/transactions" className="btn btn-primary mt-4">
                  Add your first transaction
                </Link>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: t.category.color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.category.name}</p>
                      <p className="truncate text-xs text-muted">
                        {formatShortDate(t.date)}, {t.user.name}
                        {t.note ? `, ${t.note}` : ""}
                      </p>
                    </div>
                    <p
                      className={`num shrink-0 text-sm font-medium ${
                        t.type === "INCOME" ? "text-income" : "text-expense"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : "-"}
                      {formatINR(Number(t.amount))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {/* Top spending */}
          <section className="card p-5" aria-labelledby="spend-heading">
            <h2 id="spend-heading" className="text-base font-semibold">Where the money went</h2>
            {byCategory.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No expenses recorded in {monthLabel} yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {byCategory.map((row) => {
                  const cat = catMap.get(row.categoryId);
                  const amount = Number(row._sum.amount ?? 0);
                  const pct = expense > 0 ? (amount / expense) * 100 : 0;
                  return (
                    <li key={row.categoryId}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{cat?.name ?? "Unknown"}</span>
                        <span className="num shrink-0 text-muted">
                          {formatINR(amount)} ({Math.round(pct)}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: cat?.color ?? "#0e4f4a" }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Household */}
          <section className="card p-5" aria-labelledby="house-heading">
            <h2 id="house-heading" className="text-base font-semibold">Household</h2>
            <ul className="mt-3 space-y-2.5">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
                  >
                    {m.name
                      .split(/\s+/)
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">
                    {m.name}
                    {m.id === user.id ? " (you)" : ""}
                  </span>
                  <span className="text-xs text-muted">{m.role === "OWNER" ? "Owner" : "Member"}</span>
                </li>
              ))}
            </ul>

            {user.role === "OWNER" && (
              <div className="mt-5 rounded-lg bg-brand-soft p-3">
                <p className="text-xs text-muted">Invite code for family members</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <code className="select-all truncate font-mono text-sm">{user.household.inviteCode}</code>
                  <CopyButton value={user.household.inviteCode} />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}