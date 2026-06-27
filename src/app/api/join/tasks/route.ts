import { NextResponse } from "next/server";
import { getMemberTasks } from "@/lib/join";

export async function POST(req: Request) {
  const { code, memberId } = await req.json().catch(() => ({}));
  if (!code || !memberId) return NextResponse.json({ ok: false }, { status: 400 });

  const tasks = await getMemberTasks(String(code), String(memberId));
  if (!tasks) return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true, ...tasks });
}
