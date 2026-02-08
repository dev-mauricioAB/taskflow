import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth(request);
  const roles = session?.user?.roles ?? [];

  if (!session || !roles.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
