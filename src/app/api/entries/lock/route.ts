import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.bAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, memberId } = await req.json();

  // Check entry exists and has amount
  const entry = await prisma.pc_daily_entries.findFirst({
    where: { date: new Date(date), memberId, bAccountId: session.bAccountId },
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (entry.isLocked) {
    return NextResponse.json({ error: "Already locked" }, { status: 400 });
  }

  if (!entry.amount || entry.amount === 0) {
    return NextResponse.json({ error: "Cannot lock zero amount" }, { status: 400 });
  }

  const updated = await prisma.pc_daily_entries.update({
    where: { id: entry.id },
    data: { isLocked: true, lockedAt: new Date() },
  });

  return NextResponse.json(updated);
}
