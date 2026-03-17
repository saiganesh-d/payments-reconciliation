import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check the last 7 days for incomplete submissions
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const missedDays: { bAccountId: string; bAccountName: string; date: string }[] = [];

  const bAccounts = await prisma.pc_b_accounts.findMany({
    include: { pGroups: true },
  });

  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);

    for (const ba of bAccounts) {
      // If this B-account is the current user's (for B_ACCOUNT role)
      if (session.role === "B_ACCOUNT" && session.bAccountId !== ba.id) continue;

      if (ba.pGroups.length === 0) continue;

      const daySubmission = await prisma.pc_day_submissions.findFirst({
        where: { bAccountId: ba.id, date: checkDate },
      });

      if (!daySubmission || daySubmission.status !== "FINALIZED") {
        missedDays.push({
          bAccountId: ba.id,
          bAccountName: ba.name,
          date: checkDate.toISOString().split("T")[0],
        });
      }
    }
  }

  return NextResponse.json(missedDays);
}
