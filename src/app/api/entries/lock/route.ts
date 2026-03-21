import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.bAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, memberId, version = 1 } = await req.json();

  const entry = await prisma.pc_daily_entries.findFirst({
    where: { date: new Date(date), memberId, bAccountId: session.bAccountId, version },
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (entry.isLocked) {
    return NextResponse.json({ error: "Already locked" }, { status: 400 });
  }

  // 0 is a valid amount — allow locking

  const updated = await prisma.pc_daily_entries.update({
    where: { id: entry.id },
    data: { isLocked: true, lockedAt: new Date() },
  });

  return NextResponse.json(updated);
}
