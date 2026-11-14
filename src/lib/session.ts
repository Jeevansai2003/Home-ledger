import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";

const COOKIE = "ledger_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is missing in .env");
  return new TextEncoder().encode(secret);
}

// Creates a database session row and a signed JWT that points at it.
export async function createSession(userId: string) {
  const userAgent = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  const now = Date.now();

  // Tidy up expired sessions
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });

  const session = await prisma.session.create({
    data: { userId, userAgent, expiresAt: new Date(now + MAX_AGE_SEC * 1000) },
  });

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(session.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getKey());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

// Valid only if the signature is good AND the session row still exists.
export async function readSession(): Promise<{ userId: string; sessionId: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, getKey()));
  } catch {
    return null;
  }

  const sessionId = payload.jti;
  const userId = payload.sub;
  if (!sessionId || !userId) return null;

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId || session.expiresAt < new Date()) return null;

  return { userId, sessionId };
}

export async function destroySession() {
  const current = await readSession();
  if (current) {
    await prisma.session.deleteMany({ where: { id: current.sessionId } });
  }
  (await cookies()).delete(COOKIE);
}