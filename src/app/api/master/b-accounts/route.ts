import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Date required" }, { status: 400 });
  }

  const targetDate = new Date(date);

  const bAccounts = await prisma.pc_b_accounts.findMany({
    include: {
      pGroups: {
        include: { members: { where: { isActive: true } } },
      },
      nNames: { where: { isActive: true } },
      qNames: { where: { isActive: true } },
    },
    orderBy: { name: "asc" },
  });

  const bAccountIds = bAccounts.map((ba) => ba.id);

  // Batch all queries — no version filter on entries (sum ALL versions)
  const [allDaySubmissions, allGroupSubmissions, allEntries, allNEntries, allQEntries] = await Promise.all([
    prisma.pc_day_submissions.findMany({
      where: { bAccountId: { in: bAccountIds }, date: targetDate },
    }),
    prisma.pc_group_submissions.findMany({
      where: { bAccountId: { in: bAccountIds }, date: targetDate },
    }),
    prisma.pc_daily_entries.findMany({
      where: { bAccountId: { in: bAccountIds }, date: targetDate },
    }),
    prisma.pc_daily_n_entries.findMany({
      where: { bAccountId: { in: bAccountIds }, date: targetDate },
    }),
    prisma.pc_daily_q_entries.findMany({
      where: { bAccountId: { in: bAccountIds }, date: targetDate },
    }),
  ]);

  // Index by bAccountId for O(1) lookups
  const daySubMap = new Map<string, typeof allDaySubmissions>();
  for (const d of allDaySubmissions) {
    const arr = daySubMap.get(d.bAccountId) || [];
    arr.push(d);
    daySubMap.set(d.bAccountId, arr);
  }
  const groupSubMap = new Map<string, typeof allGroupSubmissions>();
  for (const gs of allGroupSubmissions) {
    const arr = groupSubMap.get(gs.bAccountId) || [];
    arr.push(gs);
    groupSubMap.set(gs.bAccountId, arr);
  }
  const entriesMap = new Map<string, typeof allEntries>();
  for (const e of allEntries) {
    const arr = entriesMap.get(e.bAccountId) || [];
    arr.push(e);
    entriesMap.set(e.bAccountId, arr);
  }
  const nEntriesMap = new Map<string, typeof allNEntries>();
  for (const ne of allNEntries) {
    const arr = nEntriesMap.get(ne.bAccountId) || [];
    arr.push(ne);
    nEntriesMap.set(ne.bAccountId, arr);
  }
  const qEntriesMap = new Map<string, typeof allQEntries>();
  for (const qe of allQEntries) {
    const arr = qEntriesMap.get(qe.bAccountId) || [];
    arr.push(qe);
    qEntriesMap.set(qe.bAccountId, arr);
  }

  const result = bAccounts.map((ba) => {
    const entries = entriesMap.get(ba.id) || [];
    const nEntries = nEntriesMap.get(ba.id) || [];
    const qEntries = qEntriesMap.get(ba.id) || [];
    const groupSubmissions = groupSubMap.get(ba.id) || [];
    const daySubmissions = daySubMap.get(ba.id) || [];

    // P-total sums across ALL versions
    const pTotal = entries.reduce((sum, e) => sum + e.amount, 0);
    const nTotal = nEntries.reduce((sum, e) => sum + e.amount, 0);
    const qTotal = qEntries.reduce((sum, e) => sum + e.amount, 0);

    // For submitted groups, count unique submitted groups across all versions
    const submittedGroups = new Set(
      groupSubmissions.filter((s) => s.status === "SUBMITTED").map((s) => s.pGroupId)
    ).size;

    // Status: use highest version's status, or check if any version is finalized
    const latestDaySub = daySubmissions.sort((a, b) => b.version - a.version)[0];

    return {
      id: ba.id,
      name: ba.name,
      pGroupCount: ba.pGroups.length,
      submittedGroups,
      status: latestDaySub?.status || "NOT_STARTED",
      pTotal,
      nTotal,
      qTotal,
      difference: (pTotal + qTotal) - nTotal,
      nNameCount: ba.nNames.length,
      qNameCount: ba.qNames.length,
    };
  });

  return NextResponse.json(result);
}
