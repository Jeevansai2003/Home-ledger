import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { readSession } from "./session";

// cache() means the layout and the page share one lookup per request.
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    include: { household: true },
  });
});

// Use at the top of any protected page / action.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}