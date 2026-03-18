import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bAccountId = req.nextUrl.searchParams.get("bAccountId");
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");
  const pGroupId = req.nextUrl.searchParams.get("pGroupId");
  const fluctuationCutoff = parseFloat(req.nextUrl.searchParams.get("fluctuationCutoff") || "50");
  const topN = parseInt(req.nextUrl.searchParams.get("topN") || "10", 10);

  if (!bAccountId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "bAccountId, startDate, and endDate are required" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const [entries, pGroups] = await Promise.all([
    prisma.pc_daily_entries.findMany({
      where: {
        bAccountId,
        date: { gte: start, lte: end },
        ...(pGroupId ? { pGroupId } : {}),
      },
      select: { date: true, memberId: true, pGroupId: true, amount: true },
    }),
    prisma.pc_p_groups.findMany({
      where: { bAccountId },
      include: { members: { where: { isActive: true } } },
    }),
  ]);

  // Build member/group name lookup
  const memberNameMap = new Map<string, string>();
  const memberGroupMap = new Map<string, string>();
  for (const group of pGroups) {
    for (const member of group.members) {
      memberNameMap.set(member.id, member.name);
      memberGroupMap.set(member.id, group.name);
    }
  }

  // Build "active dates" — dates where this B-account had any entries
  const activeDatesSet = new Set<string>();
  for (const e of entries) {
    activeDatesSet.add(e.date.toISOString().split("T")[0]);
  }
  const activeDates = [...activeDatesSet].sort();

  if (activeDates.length === 0) {
    return NextResponse.json({
      topFluctuators: [],
      activeDates,
      totalMembers: memberNameMap.size,
      flaggedCount: 0,
    });
  }

  // Aggregate: Map<memberId, Map<dateStr, totalAmount>> — sums across versions
  const memberDailyMap = new Map<string, Map<string, number>>();
  for (const e of entries) {
    const dateStr = e.date.toISOString().split("T")[0];
    if (!memberDailyMap.has(e.memberId)) {
      memberDailyMap.set(e.memberId, new Map());
    }
    const dailyMap = memberDailyMap.get(e.memberId)!;
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + e.amount);
  }

  // Compute fluctuation per member
  // For active dates where a member has no entry, they get 0
  interface MemberFluctuation {
    memberId: string;
    memberName: string;
    groupName: string;
    avgAmount: number;
    minAmount: number;
    maxAmount: number;
    fluctuationPct: number;
    activeDays: number;
    dailyAmounts: { date: string; amount: number }[];
  }

  const allMembers: MemberFluctuation[] = [];

  for (const [memberId, dailyMap] of memberDailyMap) {
    const amounts = activeDates.map((d) => dailyMap.get(d) || 0);
    const sum = amounts.reduce((a, b) => a + b, 0);
    const mean = sum / amounts.length;

    if (mean === 0) continue; // skip members with zero total

    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const fluctuationPct = ((max - min) / mean) * 100;

    allMembers.push({
      memberId,
      memberName: memberNameMap.get(memberId) || "Unknown",
      groupName: memberGroupMap.get(memberId) || "Unknown",
      avgAmount: Math.round(mean),
      minAmount: min,
      maxAmount: max,
      fluctuationPct: Math.round(fluctuationPct * 10) / 10,
      activeDays: amounts.filter((a) => a > 0).length,
      dailyAmounts: activeDates.map((date) => ({
        date,
        amount: dailyMap.get(date) || 0,
      })),
    });
  }

  // Sort by fluctuation desc
  allMembers.sort((a, b) => b.fluctuationPct - a.fluctuationPct);

  const flaggedCount = allMembers.filter((m) => m.fluctuationPct >= fluctuationCutoff).length;

  // Return top N with daily amounts, rest without
  const topFluctuators = allMembers.slice(0, topN);

  return NextResponse.json({
    topFluctuators,
    activeDates,
    totalMembers: memberDailyMap.size,
    flaggedCount,
  });
}
