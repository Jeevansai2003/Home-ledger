import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  currentMonth, formatDayHeading, formatINR, isValidMonth, monthLabel, monthRange,
} from "@/lib/format";
import { addTransactionAction, deleteTransactionAction } from "@/app/actions/transactions";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import MonthSwitcher from "@/components/MonthSwitcher";
import PageHeader from "@/components/PageHeader";
import TransactionForm from "@/components/TransactionForm";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const householdId = user.householdId;

  const month = isValidMonth(sp.month) ? sp.month : currentMonth();
  const { start, end } = monthRange(month);

  const [transactions, categories, accounts, members, latest] = await Promise.all([
    prisma.transaction.findMany({
      where: { householdId, date: { gte: start, lt: end } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { category: true, account: true, user: true },
    }),
    prisma.category.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.transaction.findFirst({
      where: { householdId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
  ]);

  const income = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
  const net = income - expense;

  const groups: { key: string; date: Date; items: typeof transactions }[] = [];
  for (const t of transactions) {
    const key = t.date.toISOString().slice(0, 10);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(t);
    else groups.push({ key, date: t.date, items: [t] });
  }

  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink";

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <PageHeader title="Transactions" description="Every rupee in and out, for the whole household.">
        <MonthSwitcher basePath="/transactions" month={month} />
      </PageHeader>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* Add form */}
        <section className="card self-start p-5 lg:sticky lg:top-6 lg:order-2 lg:col-span-2" aria-labelledby="add-heading">
          <h2 id="add-heading" className="mb-4 text-base font-semibold">Add a transaction</h2>
          <TransactionForm
            key={latest?.id ?? "empty"} // a new transaction gives a new key, which resets the form
            action={addTransactionAction}
            categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            members={members.map((m) => ({ id: m.id, name: m.name }))}
            currentUserId={user.id}
            today={new Date().toISOString().slice(0, 10)}
            submitLabel="Add transaction"
            pendingText="Adding…"
            error={sp.error}
          />
        </section>

        {/* List */}
        <section className="space-y-4 lg:order-1 lg:col-span-3" aria-label={`Transactions in ${monthLabel(month)}`}>
          <dl className="card grid grid-cols-3 divide-x divide-line">
            <div className="px-4 py-3">
              <dt className="text-xs text-muted">Income</dt>
              <dd className="num mt-0.5 font-semibold text-income">{formatINR(income)}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-xs text-muted">Expenses</dt>
              <dd className="num mt-0.5 font-semibold text-expense">{formatINR(expense)}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-xs text-muted">Left</dt>
              <dd className={`num mt-0.5 font-semibold ${net >= 0 ? "text-ink" : "text-expense"}`}>
                {formatINR(net)}
              </dd>
            </div>
          </dl>

          {groups.length === 0 ? (
            <div className="card px-5 py-12 text-center">
              <p className="font-medium">No transactions in {monthLabel(month)}</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                Use the form to add an expense or income. It will appear here straight away.
              </p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key}>
                <h3 className="mb-2 px-1 text-sm font-medium text-muted">{formatDayHeading(g.date)}</h3>
                <ul className="card divide-y divide-line">
                  {g.items.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: t.category.color }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.category.name}</p>
                        <p className="truncate text-xs text-muted">
                          {t.account.name}, {t.user.name}
                          {t.note ? `, ${t.note}` : ""}
                        </p>
                      </div>
                      <p
                        className={`num shrink-0 text-sm font-semibold ${
                          t.type === "INCOME" ? "text-income" : "text-expense"
                        }`}
                      >
                        {t.type === "INCOME" ? "+" : "-"}
                        {formatINR(Number(t.amount))}
                      </p>
                      <div className="flex shrink-0 items-center">
                        <Link href={`/transactions/${t.id}/edit`} className={iconBtn} aria-label="Edit transaction" title="Edit">
                          <Pencil size={16} aria-hidden="true" />
                        </Link>
                        <form action={deleteTransactionAction}>
                          <input type="hidden" name="id" value={t.id} />
                          <ConfirmSubmit
                            message="Delete this transaction? This cannot be undone."
                            label="Delete transaction"
                            className={`${iconBtn} hover:bg-expense-soft hover:text-expense`}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </ConfirmSubmit>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
