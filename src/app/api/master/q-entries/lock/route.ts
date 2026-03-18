import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, qNameId, action } = await req.json();

  const entry = await prisma.pc_daily_q_entries.findFirst({
    where: { date: new Date(date), qNameId },
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found. Save the amount first." }, { status: 404 });
  }

  if (action === "lock") {
    if (entry.isLocked) {
      return NextResponse.json({ error: "Already locked" }, { status: 400 });
    }
    const updated = await prisma.pc_daily_q_entries.update({
      where: { id: entry.id },
      data: { isLocked: true, lockedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  if (action === "unlock") {
    if (!entry.isLocked) {
      return NextResponse.json({ error: "Not locked" }, { status: 400 });
    }
    const updated = await prisma.pc_daily_q_entries.update({
      where: { id: entry.id },
      data: { isLocked: false, lockedAt: null },
    });

    await prisma.pc_audit_logs.create({
      data: {
        action: "unlock_q_entry",
        actorId: session.id,
        entityType: "pc_daily_q_entries",
        entityId: entry.id,
        oldValue: JSON.stringify({ amount: entry.amount, isLocked: true }),
        newValue: JSON.stringify({ isLocked: false }),
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
