import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayIST } from "@/lib/bills";
import { updateBillAction } from "@/app/actions/bills";
import BillForm from "@/components/BillForm";

export const metadata: Metadata = { title: "Edit bill" };

export default async function EditBillPage({
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

  const bill = await prisma.recurringBill.findFirst({ where: { id, householdId } });
  if (!bill) notFound();

  const [categories, accounts] = await Promise.all([
    prisma.category.findMany({ where: { householdId, type: "EXPENSE" }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-xl px-5 py-8 sm:px-8">
      <Link href="/bills" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to bills
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Edit bill</h1>

      <div className="card mt-6 p-5">
        <BillForm
          action={updateBillAction}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          today={todayIST()}
          submitLabel="Save changes"
          pendingText="Saving…"
          error={error}
          defaults={{
            id: bill.id,
            name: bill.name,
            amount: Number(bill.amount).toFixed(2),
            frequency: bill.frequency,
            nextDue: bill.nextDue.toISOString().slice(0, 10),
            categoryId: bill.categoryId,
            accountId: bill.accountId ?? "",
          }}
        />
      </div>
    </main>
  );
}