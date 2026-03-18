import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// B-account user can unlock their own entries ONLY if the group hasn't been submitted yet
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

  // Check if the group has already been submitted for this version
  const groupSubmission = await prisma.pc_group_submissions.findFirst({
    where: { date: new Date(date), pGroupId: entry.pGroupId, version, status: "SUBMITTED" },
  });

  if (groupSubmission) {
    return NextResponse.json(
      { error: "Cannot unlock — group has already been submitted. Contact Master." },
      { status: 400 }
    );
  }

  const updated = await prisma.pc_daily_entries.update({
    where: { id: entry.id },
    data: { isLocked: false, lockedAt: null },
  });

  return NextResponse.json(updated);
}
