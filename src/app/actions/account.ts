"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { readSession } from "@/lib/session";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimit";

function fail(message: string): never {
  redirect(`/account?error=${encodeURIComponent(message)}`);
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const key = `pwchange:${user.id}`;
  const limit = checkRateLimit(key, 5, 15 * 60 * 1000);
  if (!limit.ok) fail("Too many attempts. Please try again in a few minutes.");

  if (next.length < 8) fail("New password must be at least 8 characters");
  if (next !== confirm) fail("The new passwords do not match");
  if (next === current) fail("Choose a password that is different from the current one");

  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) fail("Current password is incorrect");

  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Sign out every other device
  const session = await readSession();
  await prisma.session.deleteMany({
    where: { userId: user.id, ...(session ? { id: { not: session.sessionId } } : {}) },
  });

  resetRateLimit(key);
  revalidatePath("/account");
  redirect("/account?saved=password");
}

export async function logoutOtherDevicesAction() {
  const user = await requireUser();
  const session = await readSession();

  await prisma.session.deleteMany({
    where: { userId: user.id, ...(session ? { id: { not: session.sessionId } } : {}) },
  });

  revalidatePath("/account");
  redirect("/account?saved=others");
}