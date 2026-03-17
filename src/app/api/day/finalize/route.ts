import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.bAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date } = await req.json();

  // Verify all groups are submitted
  const groups = await prisma.pc_p_groups.findMany({
    where: { bAccountId: session.bAccountId },
  });

  const submissions = await prisma.pc_group_submissions.findMany({
    where: {
      date: new Date(date),
      bAccountId: session.bAccountId,
    },
  });

  const allSubmitted = groups.every((g) => {
    const sub = submissions.find((s) => s.pGroupId === g.id);
    return sub?.status === "SUBMITTED";
  });

  if (!allSubmitted) {
    return NextResponse.json({ error: "All groups must be submitted before finalizing" }, { status: 400 });
  }

  const daySubmission = await prisma.pc_day_submissions.upsert({
    where: { date_bAccountId: { date: new Date(date), bAccountId: session.bAccountId } },
    create: {
      date: new Date(date),
      bAccountId: session.bAccountId,
      status: "FINALIZED",
      finalizedAt: new Date(),
    },
    update: { status: "FINALIZED", finalizedAt: new Date() },
  });

  return NextResponse.json(daySubmission);
}
