import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { readSession } from "./session";

export async function getCurrentUser() {
  const id = await readSession();
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    include: { household: true },
  });
}

// Use at the top of any protected page / action.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
