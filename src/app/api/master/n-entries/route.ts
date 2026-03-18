import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, bAccountId, nNameId, amount, version = 1 } = await req.json();

  const existing = await prisma.pc_daily_n_entries.findFirst({
    where: { date: new Date(date), nNameId, version },
  });

  if (existing && existing.amount !== amount) {
    await prisma.pc_audit_logs.create({
      data: {
        action: "edit",
        actorId: session.id,
        entityType: "pc_daily_n_entries",
        entityId: existing.id,
        oldValue: JSON.stringify({ amount: existing.amount }),
        newValue: JSON.stringify({ amount }),
      },
    });
  }

  const entry = await prisma.pc_daily_n_entries.upsert({
    where: { date_nNameId_version: { date: new Date(date), nNameId, version } },
    create: {
      date: new Date(date),
      bAccountId,
      nNameId,
      version,
      amount,
    },
    update: { amount },
  });

  return NextResponse.json(entry);
}
