"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// Reads and validates the form. Type (income/expense) comes from the category.
async function parseForm(formData: FormData, householdId: string, back: string) {
  const amount = Number(formData.get("amount"));
  const date = String(formData.get("date") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) fail(back, "Enter a valid amount");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(back, "Pick a valid date");

  const [category, account, payer] = await Promise.all([
    prisma.category.findFirst({ where: { id: categoryId, householdId } }),
    prisma.account.findFirst({ where: { id: accountId, householdId } }),
    prisma.user.findFirst({ where: { id: userId, householdId } }),
  ]);
  if (!category || !account || !payer) fail(back, "Invalid category, account or member");

  return {
    type: category.type,
    amount: new Prisma.Decimal(amount.toFixed(2)),
    date: new Date(`${date}T00:00:00Z`),
    note: note || null,
    categoryId,
    accountId,
    userId,
  };
}

export async function addTransactionAction(formData: FormData) {
  const user = await requireUser();
  const data = await parseForm(formData, user.householdId, "/transactions");
  await prisma.transaction.create({ data: { ...data, householdId: user.householdId } });
  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function updateTransactionAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const back = `/transactions/${id}/edit`;

  const existing = await prisma.transaction.findFirst({
    where: { id, householdId: user.householdId },
  });
  if (!existing) fail("/transactions", "Transaction not found");

  const data = await parseForm(formData, user.householdId, back);
  await prisma.transaction.update({ where: { id }, data });
  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function deleteTransactionAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.transaction.deleteMany({ where: { id, householdId: user.householdId } });
  revalidatePath("/transactions");
  redirect("/transactions");
}