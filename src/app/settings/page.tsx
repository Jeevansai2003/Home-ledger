import type { Metadata } from "next";
import { Banknote, CreditCard, Landmark, Smartphone, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";
import {
  addAccountAction,
  addCategoryAction,
  deleteAccountAction,
  deleteCategoryAction,
} from "@/app/actions/settings";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Accounts and categories" };

const typeInfo = {
  BANK: { label: "Bank", icon: Landmark },
  CASH: { label: "Cash", icon: Banknote },
  UPI: { label: "UPI", icon: Smartphone },
  CARD: { label: "Card", icon: CreditCard },
} as const;

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

  const groups = [
    { title: "Expense categories", list: categories.filter((c) => c.type === "EXPENSE") },
    { title: "Income categories", list: categories.filter((c) => c.type === "INCOME") },
  ];
  const dangerBtn =
    "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-expense-soft hover:text-expense";

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-5 py-8 sm:px-8">
      <PageHeader
        title="Accounts and categories"
        description="Where your money lives, and the labels you sort it by."
      />

      {error && <p role="alert" className="alert-error">{error}</p>}

      {/* Accounts */}
      <section aria-labelledby="accounts-heading" className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 id="accounts-heading" className="mb-3 text-lg font-semibold">Accounts</h2>
          <ul className="card divide-y divide-line">
            {accounts.map((a) => {
              const { label, icon: Icon } = typeInfo[a.type];
              const bal = balance(a.id, Number(a.openingBalance));
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted">{label}</p>
                  </div>
                  <p className={`num shrink-0 text-sm font-semibold ${bal < 0 ? "text-expense" : ""}`}>
                    {formatINR(bal)}
                  </p>
                  <form action={deleteAccountAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <ConfirmSubmit
                      message={`Delete the account "${a.name}"? This cannot be undone.`}
                      label={`Delete account ${a.name}`}
                      className={dangerBtn}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </ConfirmSubmit>
                  </form>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">
            An account with transactions cannot be deleted. Balance is the opening balance plus income minus expenses.
          </p>
        </div>

        <form action={addAccountAction} className="card space-y-4 self-start p-5 lg:col-span-2">
          <h3 className="text-base font-semibold">Add an account</h3>
          <div>
            <label htmlFor="acc-name" className="field-label">Name</label>
            <input id="acc-name" name="name" required placeholder="e.g. HDFC savings" className="input" />
          </div>
          <div>
            <label htmlFor="acc-type" className="field-label">Type</label>
            <select id="acc-type" name="type" className="input" defaultValue="BANK">
              <option value="BANK">Bank</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>
          </div>
          <div>
            <label htmlFor="acc-open" className="field-label">Opening balance</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">₹</span>
              <input id="acc-open" name="openingBalance" type="number" inputMode="decimal" step="0.01" placeholder="0" className="input num pl-8" />
            </div>
          </div>
          <SubmitButton pendingText="Adding…">Add account</SubmitButton>
        </form>
      </section>

      {/* Categories */}
      <section aria-labelledby="categories-heading" className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <h2 id="categories-heading" className="text-lg font-semibold">Categories</h2>
          {groups.map(({ title, list }) => (
            <div key={title}>
              <h3 className="mb-2 text-sm font-medium text-muted">{title}</h3>
              <ul className="card divide-y divide-line">
                {list.length === 0 && (
                  <li className="px-4 py-3 text-sm text-muted">None yet.</li>
                )}
                {list.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden="true" />
                    <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                    <form action={deleteCategoryAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmSubmit
                        message={`Delete the category "${c.name}"? This cannot be undone.`}
                        label={`Delete category ${c.name}`}
                        className={dangerBtn}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </ConfirmSubmit>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-muted">A category that is used by a transaction or bill cannot be deleted.</p>
        </div>

        <form action={addCategoryAction} className="card space-y-4 self-start p-5 lg:col-span-2">
          <h3 className="text-base font-semibold">Add a category</h3>
          <div>
            <label htmlFor="cat-name" className="field-label">Name</label>
            <input id="cat-name" name="name" required placeholder="e.g. Pet care" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cat-type" className="field-label">Type</label>
              <select id="cat-type" name="type" className="input" defaultValue="EXPENSE">
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </div>
            <div>
              <label htmlFor="cat-color" className="field-label">Colour</label>
              <input
                id="cat-color"
                name="color"
                type="color"
                defaultValue="#0e4f4a"
                className="h-10 w-full cursor-pointer rounded-lg border border-line bg-surface p-1"
              />
            </div>
          </div>
          <SubmitButton pendingText="Adding…">Add category</SubmitButton>
        </form>
      </section>
    </main>
  );
}