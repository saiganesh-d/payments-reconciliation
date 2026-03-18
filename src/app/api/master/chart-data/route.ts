import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const [pEntries, nEntries, qEntries] = await Promise.all([
    prisma.pc_daily_entries.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, amount: true },
    }),
    prisma.pc_daily_n_entries.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, amount: true },
    }),
    prisma.pc_daily_q_entries.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, amount: true },
    }),
  ]);

  // Aggregate per day
  const dayMap = new Map<string, { pTotal: number; nTotal: number; qTotal: number }>();

  for (const e of pEntries) {
    const dateStr = e.date.toISOString().split("T")[0];
    const day = dayMap.get(dateStr) || { pTotal: 0, nTotal: 0, qTotal: 0 };
    day.pTotal += e.amount;
    dayMap.set(dateStr, day);
  }

  for (const e of nEntries) {
    const dateStr = e.date.toISOString().split("T")[0];
    const day = dayMap.get(dateStr) || { pTotal: 0, nTotal: 0, qTotal: 0 };
    day.nTotal += e.amount;
    dayMap.set(dateStr, day);
  }

  for (const e of qEntries) {
    const dateStr = e.date.toISOString().split("T")[0];
    const day = dayMap.get(dateStr) || { pTotal: 0, nTotal: 0, qTotal: 0 };
    day.qTotal += e.amount;
    dayMap.set(dateStr, day);
  }

  const result = Array.from(dayMap.entries())
    .map(([date, totals]) => ({
      date,
      pTotal: totals.pTotal,
      nTotal: totals.nTotal,
      qTotal: totals.qTotal,
      difference: (totals.pTotal + totals.qTotal) - totals.nTotal,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(result);
}
