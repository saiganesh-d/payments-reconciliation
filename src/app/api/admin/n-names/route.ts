import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET: List N-names for a B-account
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bAccountId = req.nextUrl.searchParams.get("bAccountId");
  if (!bAccountId) return NextResponse.json({ error: "bAccountId required" }, { status: 400 });

  const nNames = await prisma.pc_n_names.findMany({
    where: { bAccountId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(nNames);
}

// POST: Create a new N-name
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bAccountId, name } = await req.json();
  if (!bAccountId || !name) {
    return NextResponse.json({ error: "bAccountId and name required" }, { status: 400 });
  }

  // Check duplicate
  const existing = await prisma.pc_n_names.findUnique({
    where: { bAccountId_name: { bAccountId, name } },
  });
  if (existing) {
    if (!existing.isActive) {
      const reactivated = await prisma.pc_n_names.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      await prisma.pc_audit_logs.create({
        data: {
          action: "reactivate_n_name",
          actorId: session.id,
          entityType: "pc_n_names",
          entityId: existing.id,
          newValue: JSON.stringify({ name, bAccountId }),
        },
      });
      return NextResponse.json(reactivated);
    }
    return NextResponse.json({ error: "N-name already exists" }, { status: 400 });
  }

  const nName = await prisma.pc_n_names.create({
    data: { name, bAccountId },
  });

  await prisma.pc_audit_logs.create({
    data: {
      action: "create_n_name",
      actorId: session.id,
      entityType: "pc_n_names",
      entityId: nName.id,
      newValue: JSON.stringify({ name, bAccountId }),
    },
  });

  return NextResponse.json(nName);
}

// PUT: Rename an N-name
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name } = await req.json();
  if (!id || !name) {
    return NextResponse.json({ error: "id and name required" }, { status: 400 });
  }

  const nName = await prisma.pc_n_names.findUnique({ where: { id } });
  if (!nName) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.pc_n_names.update({
    where: { id },
    data: { name },
  });

  await prisma.pc_audit_logs.create({
    data: {
      action: "rename_n_name",
      actorId: session.id,
      entityType: "pc_n_names",
      entityId: id,
      oldValue: JSON.stringify({ name: nName.name }),
      newValue: JSON.stringify({ name }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE: Soft-delete an N-name
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  const nName = await prisma.pc_n_names.findUnique({ where: { id } });
  if (!nName) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.pc_n_names.update({
    where: { id },
    data: { isActive: false },
  });

  await prisma.pc_audit_logs.create({
    data: {
      action: "deactivate_n_name",
      actorId: session.id,
      entityType: "pc_n_names",
      entityId: id,
      oldValue: JSON.stringify({ name: nName.name, isActive: true }),
      newValue: JSON.stringify({ isActive: false }),
    },
  });

  return NextResponse.json(updated);
}
