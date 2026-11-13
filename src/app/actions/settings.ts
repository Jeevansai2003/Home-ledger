"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const ACCOUNT_TYPES = ["CASH", "BANK", "UPI", "CARD"] as const;
const CATEGORY_TYPES = ["EXPENSE", "INCOME"] as const;

function fail(message: string): never {
  redirect(`/settings?error=${encodeURIComponent(message)}`);
}

function done(): never {
  revalidatePath("/settings");
  redirect("/settings");
}

export async function addAccountAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const opening = Number(formData.get("openingBalance") || 0);

  if (!name) fail("Account name is required");
  if (!ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number])) fail("Invalid account type");
  if (!Number.isFinite(opening)) fail("Invalid opening balance");

  await prisma.account.create({
    data: {
      name,
      type: type as (typeof ACCOUNT_TYPES)[number],
      openingBalance: new Prisma.Decimal(opening.toFixed(2)),
      householdId: user.householdId,
    },
  });
  done();
}

export async function deleteAccountAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const householdId = user.householdId;

  const account = await prisma.account.findFirst({ where: { id, householdId } });
  if (!account) fail("Account not found");

  const used = await prisma.transaction.count({ where: { accountId: id, householdId } });
  if (used > 0) fail(`"${account.name}" has ${used} transaction(s), so it cannot be deleted`);

  await prisma.account.delete({ where: { id } });
  done();
}

export async function addCategoryAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const color = String(formData.get("color") ?? "#6366f1");

  if (!name) fail("Category name is required");
  if (!CATEGORY_TYPES.includes(type as (typeof CATEGORY_TYPES)[number])) fail("Invalid category type");
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) fail("Invalid color");

  try {
    await prisma.category.create({
      data: {
        name,
        type: type as (typeof CATEGORY_TYPES)[number],
        color,
        householdId: user.householdId,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      fail("That category already exists");
    }
    throw e;
  }
  done();
}

export async function deleteCategoryAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const householdId = user.householdId;

  const category = await prisma.category.findFirst({ where: { id, householdId } });
  if (!category) fail("Category not found");

  const [txCount, billCount] = await Promise.all([
    prisma.transaction.count({ where: { categoryId: id, householdId } }),
    prisma.recurringBill.count({ where: { categoryId: id, householdId } }),
  ]);
  if (txCount + billCount > 0) {
    fail(`"${category.name}" is in use (${txCount} transactions, ${billCount} bills), so it cannot be deleted`);
  }

  await prisma.category.delete({ where: { id } });
  done();
}