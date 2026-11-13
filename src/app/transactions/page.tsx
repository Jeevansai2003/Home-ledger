import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TransactionForm from "@/components/TransactionForm";
import {
  addTransactionAction,
  deleteTransactionAction,
} from "@/app/actions/transactions";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const month =
    sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month)
      ? sp.month
      : new Date().toISOString().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(`${shiftMonth(month, 1)}-01T00:00:00Z`);
  const householdId = user.householdId;

  const [transactions, categories, accounts, members] = await Promise.all([
    prisma.transaction.findMany({
      where: { householdId, date: { gte: start, lt: end } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { category: true, account: true, user: true },
    }),
    prisma.category.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
  ]);

  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + Number(t.amount), 0);

  const label = start.toLocaleDateString("en-IN", {
    month: "long", year: "numeric", timeZone: "UTC",
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <Link href="/dashboard" className="text-sm text-indigo-600 underline">← Dashboard</Link>
      </header>

      <TransactionForm
        action={addTransactionAction}
        categories={categories}
        accounts={accounts}
        members={members}
        currentUserId={user.id}
        submitLabel="Add transaction"
        error={sp.error}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Link href={`/transactions?month=${shiftMonth(month, -1)}`}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-100">←</Link>
          <h2 className="font-medium">{label}</h2>
          <Link href={`/transactions?month=${shiftMonth(month, 1)}`}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-100">→</Link>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-xs text-gray-500">Income</p>
            <p className="font-semibold text-green-700">{inr.format(income)}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-3">
            <p className="text-xs text-gray-500">Expenses</p>
            <p className="font-semibold text-red-700">{inr.format(expense)}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-3">
            <p className="text-xs text-gray-500">Savings</p>
            <p className="font-semibold text-indigo-700">{inr.format(income - expense)}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Category</th>
                <th className="p-3">Account</th>
                <th className="p-3">By</th>
                <th className="p-3">Note</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-gray-400">
                  No transactions this month
                </td></tr>
              )}
              {transactions.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap">
                    {t.date.toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", timeZone: "UTC",
                    })}
                  </td>
                  <td className="p-3">{t.category.name}</td>
                  <td className="p-3">{t.account.name}</td>
                  <td className="p-3">{t.user.name}</td>
                  <td className="p-3 text-gray-500">{t.note}</td>
                  <td className={`p-3 text-right whitespace-nowrap ${
                    t.type === "INCOME" ? "text-green-700" : "text-red-700"
                  }`}>
                    {t.type === "INCOME" ? "+" : "-"}{inr.format(Number(t.amount))}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <Link href={`/transactions/${t.id}/edit`}
                      className="mr-3 text-indigo-600 underline">Edit</Link>
                    <form action={deleteTransactionAction} className="inline">
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-red-600 underline">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}