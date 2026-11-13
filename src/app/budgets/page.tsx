import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setBudgetAction } from "@/app/actions/budgets";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const householdId = user.householdId;

  const month =
    sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month)
      ? sp.month
      : new Date().toISOString().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(`${shiftMonth(month, 1)}-01T00:00:00Z`);

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

  const totalBudget = [...budgetMap.values()].reduce((a, b) => a + b, 0);
  const totalSpent = categories.reduce((s, c) => s + (spentMap.get(c.id) ?? 0), 0);

  const label = start.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Budgets</h1>
        <Link href="/dashboard" className="text-sm text-indigo-600 underline">← Dashboard</Link>
      </header>

      {sp.error && <p className="rounded bg-red-50 p-3 text-sm text-red-600">{sp.error}</p>}

      <div className="flex items-center justify-between">
        <Link href={`/budgets?month=${shiftMonth(month, -1)}`}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100">←</Link>
        <h2 className="font-medium">{label}</h2>
        <Link href={`/budgets?month=${shiftMonth(month, 1)}`}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100">→</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-indigo-50 p-3">
          <p className="text-xs text-gray-500">Total budget</p>
          <p className="font-semibold text-indigo-700">{inr.format(totalBudget)}</p>
        </div>
        <div className="rounded-xl bg-red-50 p-3">
          <p className="text-xs text-gray-500">Total spent</p>
          <p className="font-semibold text-red-700">{inr.format(totalSpent)}</p>
        </div>
      </div>

      <ul className="space-y-3">
        {categories.map((c) => {
          const budget = budgetMap.get(c.id) ?? 0;
          const used = spentMap.get(c.id) ?? 0;
          const pct = budget > 0 ? (used / budget) * 100 : 0;
          const bar = pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-green-500";

          return (
            <li key={c.id} className="space-y-2 rounded-xl bg-white p-4 shadow">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </span>
                <form action={setBudgetAction} className="flex items-center gap-2">
                  <input type="hidden" name="month" value={month} />
                  <input type="hidden" name="categoryId" value={c.id} />
                  <input name="amount" type="number" step="0.01" min="0"
                    defaultValue={budget > 0 ? budget : ""} placeholder="Budget ₹"
                    className="w-28 rounded border p-1 text-sm" />
                  <button className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700">
                    Save
                  </button>
                </form>
              </div>

              {budget > 0 ? (
                <>
                  <div className="h-2 overflow-hidden rounded bg-gray-100">
                    <div className={`h-2 ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {inr.format(used)} of {inr.format(budget)} used ·{" "}
                    {budget - used >= 0
                      ? `${inr.format(budget - used)} left`
                      : `${inr.format(used - budget)} over`}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400">
                  No budget set · spent {inr.format(used)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}