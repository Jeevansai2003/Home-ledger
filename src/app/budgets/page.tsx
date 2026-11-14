import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonth, formatINR, isValidMonth, monthLabel, monthRange } from "@/lib/format";
import { setBudgetAction } from "@/app/actions/budgets";
import MonthSwitcher from "@/components/MonthSwitcher";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const householdId = user.householdId;

  const month = isValidMonth(sp.month) ? sp.month : currentMonth();
  const { start, end } = monthRange(month);

  const [categories, budgets, spent] = await Promise.all([
    prisma.category.findMany({ where: { householdId, type: "EXPENSE" }, orderBy: { name: "asc" } }),
    prisma.budget.findMany({ where: { householdId, month: start } }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { householdId, type: "EXPENSE", date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ]);

  const budgetMap = new Map(budgets.map((b) => [b.categoryId, Number(b.amount)]));
  const spentMap = new Map(spent.map((s) => [s.categoryId, Number(s._sum.amount ?? 0)]));

  const rows = categories.map((c) => {
    const budget = budgetMap.get(c.id) ?? 0;
    const used = spentMap.get(c.id) ?? 0;
    return { c, budget, used, pct: budget > 0 ? (used / budget) * 100 : 0 };
  });
  rows.sort(
    (a, b) =>
      (b.budget > 0 ? 1 : 0) - (a.budget > 0 ? 1 : 0) ||
      b.pct - a.pct ||
      a.c.name.localeCompare(b.c.name),
  );

  const budgeted = rows.filter((r) => r.budget > 0);
  const planned = budgeted.reduce((s, r) => s + r.budget, 0);
  const usedInBudgeted = budgeted.reduce((s, r) => s + r.used, 0);
  const unbudgetedSpend = rows.filter((r) => r.budget === 0).reduce((s, r) => s + r.used, 0);
  const left = planned - usedInBudgeted;
  const overall = planned > 0 ? (usedInBudgeted / planned) * 100 : 0;
  const overCount = budgeted.filter((r) => r.used > r.budget).length;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <PageHeader title="Budgets" description="Set a monthly limit for each expense category.">
        <MonthSwitcher basePath="/budgets" month={month} />
      </PageHeader>

      {sp.error && (
        <p role="alert" className="alert-error mt-6">{sp.error}</p>
      )}

      {overCount > 0 && (
        <p
          role="status"
          className="mt-6 flex items-center gap-2 rounded-lg border border-warn/25 bg-warn-soft px-3 py-2.5 text-sm text-warn"
        >
          <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
          {overCount === 1
            ? "1 category is over its budget in "
            : `${overCount} categories are over their budget in `}
          {monthLabel(month)}.
        </p>
      )}

      <section className="card mt-6 p-5" aria-label="Budget summary">
        {planned > 0 ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted">{left >= 0 ? "Left to spend" : "Over budget by"}</p>
                <p className={`num font-display text-3xl font-semibold ${left >= 0 ? "text-income" : "text-expense"}`}>
                  {formatINR(Math.abs(left))}
                </p>
              </div>
              <p className="num text-sm text-muted">
                {formatINR(usedInBudgeted)} spent of {formatINR(planned)} planned
              </p>
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-canvas"
              role="progressbar"
              aria-label="Total budget used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.round(overall))}
            >
              <div
                className={`h-full rounded-full ${overall > 100 ? "bg-expense" : overall >= 80 ? "bg-warn" : "bg-income"}`}
                style={{ width: `${Math.min(100, overall)}%` }}
              />
            </div>
            {unbudgetedSpend > 0 && (
              <p className="num mt-3 text-xs text-muted">
                {formatINR(unbudgetedSpend)} was spent in categories with no budget.
              </p>
            )}
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="font-medium">No budgets set for {monthLabel(month)}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Enter an amount next to a category below and save it. Leave it empty to remove a budget.
            </p>
          </div>
        )}
      </section>

      <ul className="card mt-6 divide-y divide-line">
        {rows.map(({ c, budget, used, pct }) => {
          const over = budget > 0 && used > budget;
          const close = budget > 0 && !over && pct >= 80;
          const bar = over ? "bg-expense" : close ? "bg-warn" : "bg-income";
          return (
            <li key={c.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} aria-hidden="true" />
                  {c.name}
                </span>

                <form action={setBudgetAction} className="flex items-center gap-2">
                  <input type="hidden" name="month" value={month} />
                  <input type="hidden" name="categoryId" value={c.id} />
                  <label htmlFor={`budget-${c.id}`} className="sr-only">Monthly budget for {c.name}</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">
                      ₹
                    </span>
                    <input
                      id={`budget-${c.id}`}
                      name="amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      defaultValue={budget > 0 ? budget : ""}
                      placeholder="No budget"
                      className="input num h-9 w-36 pl-7"
                    />
                  </div>
                  <SubmitButton className="btn btn-secondary h-9" pendingText="Saving…">Save</SubmitButton>
                </form>
              </div>

              {budget > 0 ? (
                <>
                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas"
                    role="progressbar"
                    aria-label={`${c.name} budget used`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(100, Math.round(pct))}
                  >
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <p className="num mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
                    <span>
                      {formatINR(used)} of {formatINR(budget)} used ({Math.round(pct)}%)
                    </span>
                    <span className={over ? "font-medium text-expense" : close ? "font-medium text-warn" : ""}>
                      {over
                        ? `Over by ${formatINR(used - budget)}`
                        : close
                          ? `Close to the limit, ${formatINR(budget - used)} left`
                          : `${formatINR(budget - used)} left`}
                    </span>
                  </p>
                </>
              ) : (
                <p className="num mt-2 text-xs text-muted">
                  {used > 0 ? `${formatINR(used)} spent, no budget set` : "Nothing spent, no budget set"}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}