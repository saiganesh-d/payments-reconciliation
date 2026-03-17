import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET: Fetch all entries for a B-account on a date
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.bAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Date required" }, { status: 400 });
  }

  const entries = await prisma.pc_daily_entries.findMany({
    where: {
      bAccountId: session.bAccountId,
      date: new Date(date),
    },
  });

  const groupSubmissions = await prisma.pc_group_submissions.findMany({
    where: {
      bAccountId: session.bAccountId,
      date: new Date(date),
    },
  });

  const daySubmission = await prisma.pc_day_submissions.findFirst({
    where: {
      bAccountId: session.bAccountId,
      date: new Date(date),
    },
  });

  // Get groups with members
  const groups = await prisma.pc_p_groups.findMany({
    where: { bAccountId: session.bAccountId },
    include: { members: { where: { isActive: true }, orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

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

  const { date, pGroupId, memberId, amount } = await req.json();

  // Check if day is finalized
  const daySubmission = await prisma.pc_day_submissions.findFirst({
    where: { bAccountId: session.bAccountId, date: new Date(date) },
  });
  if (daySubmission?.status === "FINALIZED") {
    return NextResponse.json({ error: "Day is finalized" }, { status: 400 });
  }

  const entry = await prisma.pc_daily_entries.upsert({
    where: { date_memberId: { date: new Date(date), memberId } },
    create: {
      date: new Date(date),
      bAccountId: session.bAccountId,
      pGroupId,
      memberId,
      amount,
    },
    update: { amount },
  });

  // Update day submission status to PARTIAL
  await prisma.pc_day_submissions.upsert({
    where: { date_bAccountId: { date: new Date(date), bAccountId: session.bAccountId } },
    create: { date: new Date(date), bAccountId: session.bAccountId, status: "PARTIAL" },
    update: { status: "PARTIAL" },
  });

  return NextResponse.json(entry);
}
