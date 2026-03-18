import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Master-only: unlock an entry
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId } = await req.json();

  const entry = await prisma.pc_daily_entries.findUnique({ where: { id: entryId } });
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  // Audit log
  await prisma.pc_audit_logs.create({
    data: {
      action: "unlock",
      actorId: session.id,
      entityType: "pc_daily_entries",
      entityId: entryId,
      oldValue: JSON.stringify({ amount: entry.amount, isLocked: true }),
      newValue: JSON.stringify({ isLocked: false }),
    },
  });

  const updated = await prisma.pc_daily_entries.update({
    where: { id: entryId },
    data: { isLocked: false, lockedAt: null },
  });

  // Also revert group submission if it was submitted (use entry's version)
  await prisma.pc_group_submissions.updateMany({
    where: { date: entry.date, pGroupId: entry.pGroupId, version: entry.version },
    data: { status: "PENDING", submittedAt: null },
  });

  // Revert day submission
  await prisma.pc_day_submissions.updateMany({
    where: { date: entry.date, bAccountId: entry.bAccountId, version: entry.version, status: "FINALIZED" },
    data: { status: "PARTIAL", finalizedAt: null },
  });

  return NextResponse.json(updated);
}
