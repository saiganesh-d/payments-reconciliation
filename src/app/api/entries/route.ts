import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET: Fetch all entries for a B-account on a date + version
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.bAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Date required" }, { status: 400 });
  }

  const version = parseInt(req.nextUrl.searchParams.get("version") || "1");
  const targetDate = new Date(date);

  const [entries, groupSubmissions, daySubmission, groups] = await Promise.all([
    prisma.pc_daily_entries.findMany({
      where: { bAccountId: session.bAccountId, date: targetDate, version },
    }),
    prisma.pc_group_submissions.findMany({
      where: { bAccountId: session.bAccountId, date: targetDate, version },
    }),
    prisma.pc_day_submissions.findFirst({
      where: { bAccountId: session.bAccountId, date: targetDate, version },
    }),
    prisma.pc_p_groups.findMany({
      where: { bAccountId: session.bAccountId },
      include: { members: { where: { isActive: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    entries,
    groupSubmissions,
    daySubmission,
    groups,
  });
}

// POST: Save/update an entry amount
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.bAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, pGroupId, memberId, amount, version = 1 } = await req.json();

  // Check if day is finalized for this version
  const daySubmission = await prisma.pc_day_submissions.findFirst({
    where: { bAccountId: session.bAccountId, date: new Date(date), version },
  });
  if (daySubmission?.status === "FINALIZED") {
    return NextResponse.json({ error: "Day is finalized" }, { status: 400 });
  }

  const entry = await prisma.pc_daily_entries.upsert({
    where: { date_memberId_version: { date: new Date(date), memberId, version } },
    create: {
      date: new Date(date),
      bAccountId: session.bAccountId,
      pGroupId,
      memberId,
      version,
      amount,
    },
    update: { amount },
  });

  // Update day submission status to PARTIAL
  await prisma.pc_day_submissions.upsert({
    where: { date_bAccountId_version: { date: new Date(date), bAccountId: session.bAccountId, version } },
    create: { date: new Date(date), bAccountId: session.bAccountId, version, status: "PARTIAL" },
    update: { status: "PARTIAL" },
  });

  return NextResponse.json(entry);
}
