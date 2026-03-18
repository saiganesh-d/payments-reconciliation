import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET: Return version statuses for a B-account + date
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date");
  const bAccountId = req.nextUrl.searchParams.get("bAccountId") || session.bAccountId;

  if (!date || !bAccountId) {
    return NextResponse.json({ error: "date and bAccountId required" }, { status: 400 });
  }

  const targetDate = new Date(date);

  const daySubmissions = await prisma.pc_day_submissions.findMany({
    where: { bAccountId, date: targetDate },
    orderBy: { version: "asc" },
  });

  // Build version statuses for V1-V3
  const versions = [1, 2, 3].map((v) => {
    const sub = daySubmissions.find((d) => d.version === v);
    return {
      version: v,
      status: sub?.status || "NOT_STARTED",
    };
  });

  return NextResponse.json(versions);
}
