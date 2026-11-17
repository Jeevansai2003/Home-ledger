import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";

// The browser calls this while you are active. Reading the session records the activity.
export async function POST() {
  const session = await readSession();
  return new NextResponse(null, {
    status: session ? 204 : 401,
    headers: { "Cache-Control": "no-store" },
  });
}
