import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bAccountId = req.nextUrl.searchParams.get("bAccountId");
  const date = req.nextUrl.searchParams.get("date");
  const version = parseInt(req.nextUrl.searchParams.get("version") || "1", 10);

  if (!bAccountId || !date) {
    return NextResponse.json({ error: "bAccountId and date are required" }, { status: 400 });
  }

  const note = await prisma.pc_version_notes.findUnique({
    where: { date_bAccountId_version: { date: new Date(date), bAccountId, version } },
  });

  return NextResponse.json({ note: note?.note || "" });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bAccountId, date, version, note } = await req.json();

  if (!bAccountId || !date || !version) {
    return NextResponse.json({ error: "bAccountId, date, and version are required" }, { status: 400 });
  }

  await prisma.pc_version_notes.upsert({
    where: { date_bAccountId_version: { date: new Date(date), bAccountId, version } },
    create: { date: new Date(date), bAccountId, version, note: note || "" },
    update: { note: note || "" },
  });

  return NextResponse.json({ ok: true });
}
