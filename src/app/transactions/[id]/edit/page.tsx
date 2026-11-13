import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TransactionForm from "@/components/TransactionForm";
import { updateTransactionAction } from "@/app/actions/transactions";

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
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit transaction</h1>
        <Link href="/transactions" className="text-sm text-indigo-600 underline">← Back</Link>
      </header>

      <TransactionForm
        action={updateTransactionAction}
        categories={categories}
        accounts={accounts}
        members={members}
        currentUserId={user.id}
        submitLabel="Save changes"
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
    </main>
  );
}