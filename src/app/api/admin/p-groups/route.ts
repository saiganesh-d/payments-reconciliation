import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET: List all P-groups for a B-account
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bAccountId =
    session.role === "MASTER"
      ? req.nextUrl.searchParams.get("bAccountId")
      : session.bAccountId;

  if (!bAccountId) return NextResponse.json({ error: "bAccountId required" }, { status: 400 });

  const groups = await prisma.pc_p_groups.findMany({
    where: { bAccountId },
    include: { members: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(groups);
}

// POST: Create a new P-group
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bAccountId, name } = await req.json();

  const targetBAccountId =
    session.role === "MASTER" ? bAccountId : session.bAccountId;

  if (!targetBAccountId || !name) {
    return NextResponse.json({ error: "bAccountId and name required" }, { status: 400 });
  }

  // Check duplicate
  const existing = await prisma.pc_p_groups.findUnique({
    where: { bAccountId_name: { bAccountId: targetBAccountId, name } },
  });
  if (existing) {
    return NextResponse.json({ error: "Group name already exists" }, { status: 400 });
  }

  const group = await prisma.pc_p_groups.create({
    data: { name, bAccountId: targetBAccountId },
  });

  await prisma.pc_audit_logs.create({
    data: {
      action: "create_group",
      actorId: session.id,
      entityType: "pc_p_groups",
      entityId: group.id,
      newValue: JSON.stringify({ name, bAccountId: targetBAccountId }),
    },
  });

  return NextResponse.json(group);
}

// PUT: Rename a P-group
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name } = await req.json();
  if (!id || !name) {
    return NextResponse.json({ error: "id and name required" }, { status: 400 });
  }

  const group = await prisma.pc_p_groups.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auth check: B_ACCOUNT can only edit own groups
  if (session.role === "B_ACCOUNT" && group.bAccountId !== session.bAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const updated = await prisma.pc_p_groups.update({
    where: { id },
    data: { name },
  });

  await prisma.pc_audit_logs.create({
    data: {
      action: "rename_group",
      actorId: session.id,
      entityType: "pc_p_groups",
      entityId: id,
      oldValue: JSON.stringify({ name: group.name }),
      newValue: JSON.stringify({ name }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE: Delete a P-group (only if no entries exist)
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  const entries = await prisma.pc_daily_entries.findFirst({ where: { pGroupId: id } });
  if (entries) {
    return NextResponse.json(
      { error: "Cannot delete group with existing entries. Remove entries first." },
      { status: 400 }
    );
  }

  // Delete members first
  await prisma.pc_p_group_members.deleteMany({ where: { pGroupId: id } });
  // Delete group submissions
  await prisma.pc_group_submissions.deleteMany({ where: { pGroupId: id } });

  const group = await prisma.pc_p_groups.delete({ where: { id } });

  await prisma.pc_audit_logs.create({
    data: {
      action: "delete_group",
      actorId: session.id,
      entityType: "pc_p_groups",
      entityId: id,
      oldValue: JSON.stringify({ name: group.name }),
    },
  });

  return NextResponse.json({ success: true });
}
