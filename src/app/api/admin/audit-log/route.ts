import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  const entityType = req.nextUrl.searchParams.get("entityType");

  const where = entityType ? { entityType } : {};

  const [logs, total] = await Promise.all([
    prisma.pc_audit_logs.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.pc_audit_logs.count({ where }),
  ]);

  // Enrich with actor names
  const actorIds = [...new Set(logs.map((l) => l.actorId))];
  const actors = await prisma.pc_users.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a.name]));

  const enrichedLogs = logs.map((log) => ({
    ...log,
    actorName: actorMap[log.actorId] || "Unknown",
  }));

  return NextResponse.json({ logs: enrichedLogs, total });
}
