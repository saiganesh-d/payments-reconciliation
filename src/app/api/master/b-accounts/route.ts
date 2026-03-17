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

  const bAccounts = await prisma.pc_b_accounts.findMany({
    include: {
      pGroups: {
        include: { members: { where: { isActive: true } } },
      },
      nNames: { where: { isActive: true } },
    },
    orderBy: { name: "asc" },
  });

  // Get day submissions and entries for each b-account
  const result = await Promise.all(
    bAccounts.map(async (ba) => {
      const daySubmission = await prisma.pc_day_submissions.findFirst({
        where: { bAccountId: ba.id, date: new Date(date) },
      });

      const groupSubmissions = await prisma.pc_group_submissions.findMany({
        where: { bAccountId: ba.id, date: new Date(date) },
      });

      const entries = await prisma.pc_daily_entries.findMany({
        where: { bAccountId: ba.id, date: new Date(date) },
      });

      const nEntries = await prisma.pc_daily_n_entries.findMany({
        where: { bAccountId: ba.id, date: new Date(date) },
      });

      const pTotal = entries.reduce((sum, e) => sum + e.amount, 0);
      const nTotal = nEntries.reduce((sum, e) => sum + e.amount, 0);
      const submittedGroups = groupSubmissions.filter((s) => s.status === "SUBMITTED").length;

      return {
        id: ba.id,
        name: ba.name,
        pGroupCount: ba.pGroups.length,
        submittedGroups,
        status: daySubmission?.status || "NOT_STARTED",
        pTotal,
        nTotal,
        difference: pTotal - nTotal,
        nNameCount: ba.nNames.length,
      };
    })
  );

  return NextResponse.json(result);
}
