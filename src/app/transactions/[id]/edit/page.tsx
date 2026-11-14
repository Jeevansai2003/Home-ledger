import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTransactionAction } from "@/app/actions/transactions";
import TransactionForm from "@/components/TransactionForm";

export const metadata: Metadata = { title: "Edit transaction" };

export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;
  const householdId = user.householdId;

  const tx = await prisma.transaction.findFirst({ where: { id, householdId } });
  if (!tx) notFound();

  const [categories, accounts, members] = await Promise.all([
    prisma.category.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-xl px-5 py-8 sm:px-8">
      <Link
        href={`/transactions?month=${tx.date.toISOString().slice(0, 7)}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to transactions
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Edit transaction</h1>

      <div className="card mt-6 p-5">
        <TransactionForm
          action={updateTransactionAction}
          categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          members={members.map((m) => ({ id: m.id, name: m.name }))}
          currentUserId={user.id}
          today={new Date().toISOString().slice(0, 10)}
          submitLabel="Save changes"
          pendingText="Saving…"
          error={error}
          defaults={{
            id: tx.id,
            amount: Number(tx.amount).toFixed(2),
            date: tx.date.toISOString().slice(0, 10),
            categoryId: tx.categoryId,
            accountId: tx.accountId,
            userId: tx.userId,
            note: tx.note ?? "",
          }}
        />
      </div>
    </main>
  );
}