"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { addPeriod, todayIST, type Frequency } from "@/lib/bills";

const FREQUENCIES = ["WEEKLY", "MONTHLY", "YEARLY"] as const;

function fail(message: string, path = "/bills"): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function refresh() {
  revalidatePath("/bills");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

async function parseBill(formData: FormData, householdId: string, back: string) {
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const frequency = String(formData.get("frequency") ?? "");
  const nextDue = String(formData.get("nextDue") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");

  if (!name || name.length > 60) fail("Enter a bill name (up to 60 characters)", back);
  if (!Number.isFinite(amount) || amount <= 0) fail("Enter a valid amount", back);
  if (!FREQUENCIES.includes(frequency as Frequency)) fail("Choose how often it repeats", back);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue) || Number.isNaN(Date.parse(nextDue))) {
    fail("Pick a valid due date", back);
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId, type: "EXPENSE" },
  });
  if (!category) fail("Choose an expense category", back);

  let validAccountId: string | null = null;
  if (accountId) {
    const account = await prisma.account.findFirst({ where: { id: accountId, householdId } });
    if (!account) fail("Invalid account", back);
    validAccountId = account.id;
  }

  return {
    name,
    amount: new Prisma.Decimal(amount.toFixed(2)),
    frequency: frequency as Frequency,
    nextDue: new Date(`${nextDue}T00:00:00Z`),
    categoryId,
    accountId: validAccountId,
  };
}

export async function addBillAction(formData: FormData) {
  const user = await requireUser();
  const data = await parseBill(formData, user.householdId, "/bills");
  await prisma.recurringBill.create({ data: { ...data, householdId: user.householdId } });
  refresh();
  redirect("/bills");
}

export async function updateBillAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const back = `/bills/${id}/edit`;

  const existing = await prisma.recurringBill.findFirst({ where: { id, householdId: user.householdId } });
  if (!existing) fail("Bill not found");

  const data = await parseBill(formData, user.householdId, back);
  await prisma.recurringBill.update({ where: { id }, data });
  refresh();
  redirect("/bills");
}

export async function markBillPaidAction(formData: FormData) {
  const user = await requireUser();
  const householdId = user.householdId;
  const id = String(formData.get("id") ?? "");
  const due = String(formData.get("due") ?? "");
  const amount = Number(formData.get("amount"));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) fail("Invalid due date");
  if (!Number.isFinite(amount) || amount <= 0) fail("Enter a valid amount to pay");

  const bill = await prisma.recurringBill.findFirst({ where: { id, householdId, active: true } });
  if (!bill) fail("Bill not found, or it is paused");

  const accountId =
    bill.accountId ??
    (await prisma.account.findFirst({ where: { householdId }, orderBy: { createdAt: "asc" } }))?.id;
  if (!accountId) fail("Add an account first, then mark the bill as paid");

  const dueDate = new Date(`${due}T00:00:00Z`);
  const paidOn = new Date(`${todayIST()}T00:00:00Z`);
  const next = addPeriod(bill.nextDue, bill.frequency);

  const done = await prisma.$transaction(async (tx) => {
    // Only moves forward if the due date is still the one the person saw,
    // so a double click or two members cannot record the payment twice.
    const moved = await tx.recurringBill.updateMany({
      where: { id, householdId, nextDue: dueDate },
      data: { nextDue: next },
    });
    if (moved.count === 0) return false;

    await tx.transaction.create({
      data: {
        type: "EXPENSE",
        amount: new Prisma.Decimal(amount.toFixed(2)),
        date: paidOn,
        note: `Bill: ${bill.name}`,
        householdId,
        categoryId: bill.categoryId,
        accountId,
        userId: user.id,
      },
    });
    return true;
  });

  if (!done) fail("This bill was already marked as paid");

  refresh();
  redirect(`/bills?paid=${encodeURIComponent(bill.name)}`);
}

export async function toggleBillAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  await prisma.recurringBill.updateMany({
    where: { id, householdId: user.householdId },
    data: { active },
  });
  refresh();
  redirect("/bills");
}

export async function deleteBillAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.recurringBill.deleteMany({ where: { id, householdId: user.householdId } });
  refresh();
  redirect("/bills");
}