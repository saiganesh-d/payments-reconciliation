import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bAccountId = req.nextUrl.searchParams.get("bAccountId");
  const date = req.nextUrl.searchParams.get("date");

  if (!bAccountId || !date) {
    return NextResponse.json({ error: "bAccountId and date required" }, { status: 400 });
  }

  const bAccount = await prisma.pc_b_accounts.findUnique({
    where: { id: bAccountId },
    include: {
      pGroups: {
        include: { members: { where: { isActive: true }, orderBy: { name: "asc" } } },
        orderBy: { name: "asc" },
      },
      nNames: { where: { isActive: true }, orderBy: { name: "asc" } },
    },
  });

  if (!bAccount) {
    return NextResponse.json({ error: "B-Account not found" }, { status: 404 });
  }

  const entries = await prisma.pc_daily_entries.findMany({
    where: { bAccountId, date: new Date(date) },
  });

  const nEntries = await prisma.pc_daily_n_entries.findMany({
    where: { bAccountId, date: new Date(date) },
  });

  const groupSubmissions = await prisma.pc_group_submissions.findMany({
    where: { bAccountId, date: new Date(date) },
  });

  const daySubmission = await prisma.pc_day_submissions.findFirst({
    where: { bAccountId, date: new Date(date) },
  });

  return NextResponse.json({
    bAccount,
    entries,
    nEntries,
    groupSubmissions,
    daySubmission,
  });
}
