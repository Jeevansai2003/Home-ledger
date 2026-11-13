"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";

const EXPENSE_CATEGORIES = [
  "Groceries", "Rent", "Electricity", "Water", "Internet", "Fuel",
  "School Fees", "Medical", "Dining Out", "Shopping", "Other",
];
const INCOME_CATEGORIES = ["Salary", "Business", "Other Income"];

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function registerAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const inviteCode = String(formData.get("inviteCode") ?? "").trim();
  const householdName = String(formData.get("householdName") ?? "").trim();

  if (!name || !email) fail("/register", "Name and email are required");
  if (password.length < 8) fail("/register", "Password must be at least 8 characters");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) fail("/register", "An account with this email already exists");

  const passwordHash = await bcrypt.hash(password, 10);
  let userId: string;

  if (inviteCode) {
    // Join an existing household
    const household = await prisma.household.findUnique({ where: { inviteCode } });
    if (!household) fail("/register", "Invalid invite code");
    const user = await prisma.user.create({
      data: { name, email, passwordHash, householdId: household.id, role: "MEMBER" },
    });
    userId = user.id;
  } else {
    // Create a new household with default categories and a Cash account
    const user = await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: { name: householdName || `${name}'s Home` },
      });
      await tx.category.createMany({
        data: [
          ...EXPENSE_CATEGORIES.map((n) => ({ name: n, type: "EXPENSE" as const, householdId: household.id })),
          ...INCOME_CATEGORIES.map((n) => ({ name: n, type: "INCOME" as const, householdId: household.id })),
        ],
      });
      await tx.account.create({
        data: { name: "Cash", type: "CASH", householdId: household.id },
      });
      return tx.user.create({
        data: { name, email, passwordHash, householdId: household.id, role: "OWNER" },
      });
    });
    userId = user.id;
  }

  await createSession(userId);
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) fail("/login", "Wrong email or password");

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
