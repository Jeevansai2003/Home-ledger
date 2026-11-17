import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

// Ends the session on the server and clears the cookie.
export async function POST() {
  await destroySession();
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
