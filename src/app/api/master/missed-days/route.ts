import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getISTDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use IST today so the date is never off by 1 before 5:30 AM IST
  const todayIST = getISTDate(); // "YYYY-MM-DD"
  const today = new Date(todayIST + "T00:00:00.000Z");

  const dates: Date[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d);
  }

  const bAccounts = await prisma.pc_b_accounts.findMany({
    where: session.role === "B_ACCOUNT" ? { id: session.bAccountId! } : undefined,
    include: { pGroups: { select: { id: true } } },
  });

  const bAccountsWithGroups = bAccounts.filter((ba) => ba.pGroups.length > 0);
  if (bAccountsWithGroups.length === 0) {
    return NextResponse.json([]);
  }

  const baIds = bAccountsWithGroups.map((ba) => ba.id);

  // Only check version 1 — V1 non-finalized = missed
  const allDaySubmissions = await prisma.pc_day_submissions.findMany({
    where: {
      bAccountId: { in: baIds },
      date: { in: dates },
      version: 1,
      status: "FINALIZED",
    },
    select: { bAccountId: true, date: true },
  });

  const finalizedSet = new Set(
    allDaySubmissions.map((d) => `${d.bAccountId}_${d.date.toISOString().split("T")[0]}`)
  );

  const missedDays: { bAccountId: string; bAccountName: string; date: string }[] = [];
  const baNameMap = new Map(bAccountsWithGroups.map((ba) => [ba.id, ba.name]));

  for (const date of dates) {
    const dateStr = date.toISOString().split("T")[0];
    for (const ba of bAccountsWithGroups) {
      if (!finalizedSet.has(`${ba.id}_${dateStr}`)) {
        missedDays.push({
          bAccountId: ba.id,
          bAccountName: baNameMap.get(ba.id)!,
          date: dateStr,
        });
      }
    }
  }

  return NextResponse.json(missedDays);
}
