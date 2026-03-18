import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, bAccountId, qNameId, amount } = await req.json();

  const existing = await prisma.pc_daily_q_entries.findFirst({
    where: { date: new Date(date), qNameId },
  });

  if (existing && existing.amount !== amount) {
    await prisma.pc_audit_logs.create({
      data: {
        action: "edit",
        actorId: session.id,
        entityType: "pc_daily_q_entries",
        entityId: existing.id,
        oldValue: JSON.stringify({ amount: existing.amount }),
        newValue: JSON.stringify({ amount }),
      },
    });
  }

  const entry = await prisma.pc_daily_q_entries.upsert({
    where: { date_qNameId: { date: new Date(date), qNameId } },
    create: {
      date: new Date(date),
      bAccountId,
      qNameId,
      amount,
    },
    update: { amount },
  });

  return NextResponse.json(entry);
}
