import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.bAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, pGroupId } = await req.json();

  // Verify all members in the group have locked entries
  const members = await prisma.pc_p_group_members.findMany({
    where: { pGroupId, isActive: true },
  });

  const entries = await prisma.pc_daily_entries.findMany({
    where: {
      date: new Date(date),
      pGroupId,
      bAccountId: session.bAccountId,
    },
  });

  const allLocked = members.every((m) => {
    const entry = entries.find((e) => e.memberId === m.id);
    return entry?.isLocked;
  });

  if (!allLocked) {
    return NextResponse.json({ error: "All entries must be locked before submitting" }, { status: 400 });
  }

  const submission = await prisma.pc_group_submissions.upsert({
    where: { date_pGroupId: { date: new Date(date), pGroupId } },
    create: {
      date: new Date(date),
      bAccountId: session.bAccountId,
      pGroupId,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
    update: { status: "SUBMITTED", submittedAt: new Date() },
  });

  return NextResponse.json(submission);
}
