import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// B-account user can unlock their own entries
// If the group was submitted, it reverts group submission to PENDING
// Cannot unlock if the day has been finalized
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

  if (!entry.isLocked) {
    return NextResponse.json({ error: "Entry is not locked" }, { status: 400 });
  }

  // Check if the day has been finalized — cannot unlock after finalization
  const daySubmission = await prisma.pc_day_submissions.findFirst({
    where: { date: new Date(date), bAccountId: session.bAccountId, version, status: "FINALIZED" },
  });

  if (daySubmission) {
    return NextResponse.json(
      { error: "Cannot unlock — day has been finalized. Contact Master." },
      { status: 400 }
    );
  }

  // Unlock the entry
  const updated = await prisma.pc_daily_entries.update({
    where: { id: entry.id },
    data: { isLocked: false, lockedAt: null },
  });

  // Revert group submission if it was submitted
  await prisma.pc_group_submissions.updateMany({
    where: { date: new Date(date), pGroupId: entry.pGroupId, version, status: "SUBMITTED" },
    data: { status: "PENDING", submittedAt: null },
  });

  return NextResponse.json(updated);
}
