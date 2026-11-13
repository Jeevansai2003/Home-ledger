"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function setBudgetAction(formData: FormData) {
  const user = await requireUser();
  const householdId = user.householdId;

  const month = String(formData.get("month") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const amount = Number(formData.get("amount") || 0);
  const back = `/budgets?month=${month}`;

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) redirect("/budgets");
  if (!Number.isFinite(amount) || amount < 0) {
    redirect(`${back}&error=${encodeURIComponent("Enter a valid budget amount")}`);
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId, type: "EXPENSE" },
  });
  if (!category) redirect(`${back}&error=${encodeURIComponent("Category not found")}`);

  const monthDate = new Date(`${month}-01T00:00:00Z`);

  if (amount === 0) {
    // 0 or empty removes the budget
    await prisma.budget.deleteMany({ where: { householdId, categoryId, month: monthDate } });
  } else {
    const value = new Prisma.Decimal(amount.toFixed(2));
    await prisma.budget.upsert({
      where: { householdId_categoryId_month: { householdId, categoryId, month: monthDate } },
      update: { amount: value },
      create: { householdId, categoryId, month: monthDate, amount: value },
    });
  }

  revalidatePath("/budgets");
  redirect(back);
}