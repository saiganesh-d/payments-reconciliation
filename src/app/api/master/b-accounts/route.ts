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

  // Index by bAccountId
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

    // Per-version breakdown
    const versions = [1, 2, 3].map((v) => {
      const vEntries = entries.filter((e) => e.version === v);
      const vNEntries = nEntries.filter((e) => e.version === v);
      const vQEntries = qEntries.filter((e) => e.version === v);
      const vDaySub = daySubmissions.find((d) => d.version === v);
      const vGroupSubs = groupSubmissions.filter((s) => s.version === v);
      const vP = vEntries.reduce((sum, e) => sum + e.amount, 0);
      const vN = vNEntries.reduce((sum, e) => sum + e.amount, 0);
      const vQ = vQEntries.reduce((sum, e) => sum + e.amount, 0);
      const submittedGroups = vGroupSubs.filter((s) => s.status === "SUBMITTED").length;

      return {
        version: v,
        pTotal: vP,
        nTotal: vN,
        qTotal: vQ,
        difference: (vP + vQ) - vN,
        status: vDaySub?.status || "NOT_STARTED",
        submittedGroups,
        hasData: vP > 0 || vN > 0 || vQ > 0,
      };
    });

    // Find the latest version with any data (even partial)
    const latestActiveVersion = [...versions].reverse().find((v) => v.hasData) || versions[0];

    const submittedGroups = new Set(
      groupSubmissions.filter((s) => s.status === "SUBMITTED").map((s) => s.pGroupId)
    ).size;

    const latestDaySub = daySubmissions.sort((a, b) => b.version - a.version)[0];

    return {
      id: ba.id,
      name: ba.name,
      pGroupCount: ba.pGroups.length,
      submittedGroups,
      status: latestDaySub?.status || "NOT_STARTED",
      pTotal: latestActiveVersion.pTotal,
      nTotal: latestActiveVersion.nTotal,
      qTotal: latestActiveVersion.qTotal,
      difference: latestActiveVersion.difference,
      latestVersion: latestActiveVersion.version,
      nNameCount: ba.nNames.length,
      qNameCount: ba.qNames.length,
      versions,
    };
  });

  return NextResponse.json(result);
}
