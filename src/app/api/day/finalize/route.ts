import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.bAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, version = 1 } = await req.json();

  // Gate: if version > 1, verify previous version is FINALIZED
  if (version > 1) {
    const prevDaySub = await prisma.pc_day_submissions.findFirst({
      where: { bAccountId: session.bAccountId, date: new Date(date), version: version - 1 },
    });
    if (prevDaySub?.status !== "FINALIZED") {
      return NextResponse.json(
        { error: `Version ${version - 1} must be finalized before starting version ${version}` },
        { status: 400 }
      );
    }
  }

  // Verify all groups are submitted for this version
  const groups = await prisma.pc_p_groups.findMany({
    where: { bAccountId: session.bAccountId },
  });

  const submissions = await prisma.pc_group_submissions.findMany({
    where: {
      date: new Date(date),
      bAccountId: session.bAccountId,
      version,
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
    where: { date_bAccountId_version: { date: new Date(date), bAccountId: session.bAccountId, version } },
    create: {
      date: new Date(date),
      bAccountId: session.bAccountId,
      version,
      status: "FINALIZED",
      finalizedAt: new Date(),
    },
    update: { status: "FINALIZED", finalizedAt: new Date() },
  });

  return NextResponse.json(daySubmission);
}
