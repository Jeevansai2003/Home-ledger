import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addAccountAction,
  deleteAccountAction,
  addCategoryAction,
  deleteCategoryAction,
} from "@/app/actions/settings";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;
  const householdId = user.householdId;

  const [accounts, categories, sums] = await Promise.all([
    prisma.account.findMany({ where: { householdId }, orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { householdId },
      _sum: { amount: true },
    }),
  ]);

  function balance(accountId: string, opening: number) {
    let b = opening;
    for (const s of sums) {
      if (s.accountId !== accountId) continue;
      const v = Number(s._sum.amount ?? 0);
      b += s.type === "INCOME" ? v : -v;
    }
    return b;
  }

  const expenseCats = categories.filter((c) => c.type === "EXPENSE");
  const incomeCats = categories.filter((c) => c.type === "INCOME");

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts & Categories</h1>
        <Link href="/dashboard" className="text-sm text-indigo-600 underline">← Dashboard</Link>
      </header>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {/* ACCOUNTS */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Accounts</h2>
        <ul className="divide-y rounded-xl bg-white shadow">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between p-3 text-sm">
              <span>
                {a.name} <span className="text-gray-400">({a.type})</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="font-medium">{inr.format(balance(a.id, Number(a.openingBalance)))}</span>
                <form action={deleteAccountAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-red-600 underline">Delete</button>
                </form>
              </span>
            </li>
          ))}
        </ul>

        <form action={addAccountAction} className="grid gap-2 rounded-xl bg-white p-3 shadow sm:grid-cols-4">
          <input name="name" placeholder="Account name" required className="rounded border p-2 sm:col-span-2" />
          <select name="type" className="rounded border p-2">
            <option value="BANK">Bank</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
          </select>
          <input name="openingBalance" type="number" step="0.01" placeholder="Opening ₹"
            className="rounded border p-2" />
          <button className="rounded bg-indigo-600 p-2 text-white hover:bg-indigo-700 sm:col-span-4">
            Add account
          </button>
        </form>
      </section>

      {/* CATEGORIES */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Categories</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { title: "Expenses", list: expenseCats },
            { title: "Income", list: incomeCats },
          ].map(({ title, list }) => (
            <div key={title} className="rounded-xl bg-white p-3 shadow">
              <h3 className="mb-2 text-sm font-medium text-gray-500">{title}</h3>
              <ul className="divide-y text-sm">
                {list.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <form action={deleteCategoryAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-red-600 underline">Delete</button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <form action={addCategoryAction} className="grid gap-2 rounded-xl bg-white p-3 shadow sm:grid-cols-4">
          <input name="name" placeholder="Category name" required className="rounded border p-2 sm:col-span-2" />
          <select name="type" className="rounded border p-2">
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
          <input name="color" type="color" defaultValue="#6366f1" className="h-10 w-full rounded border p-1" />
          <button className="rounded bg-indigo-600 p-2 text-white hover:bg-indigo-700 sm:col-span-4">
            Add category
          </button>
        </form>
      </section>
    </main>
  );
}