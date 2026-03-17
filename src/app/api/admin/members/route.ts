import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// POST: Add a member to a P-group
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pGroupId, name, note } = await req.json();
  if (!pGroupId || !name) {
    return NextResponse.json({ error: "pGroupId and name required" }, { status: 400 });
  }

  // Auth check
  const group = await prisma.pc_p_groups.findUnique({ where: { id: pGroupId } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  if (session.role === "B_ACCOUNT" && group.bAccountId !== session.bAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check duplicate
  const existing = await prisma.pc_p_group_members.findUnique({
    where: { pGroupId_name: { pGroupId, name } },
  });
  if (existing) {
    // If soft-deleted, reactivate
    if (!existing.isActive) {
      const reactivated = await prisma.pc_p_group_members.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      await prisma.pc_audit_logs.create({
        data: {
          action: "reactivate_member",
          actorId: session.id,
          entityType: "pc_p_group_members",
          entityId: existing.id,
          newValue: JSON.stringify({ name, pGroupId }),
        },
      });
      return NextResponse.json(reactivated);
    }
    return NextResponse.json({ error: "Member already exists in this group" }, { status: 400 });
  }

  const member = await prisma.pc_p_group_members.create({
    data: { name, pGroupId, note: note || null },
  });

  await prisma.pc_audit_logs.create({
    data: {
      action: "add_member",
      actorId: session.id,
      entityType: "pc_p_group_members",
      entityId: member.id,
      newValue: JSON.stringify({ name, pGroupId, groupName: group.name }),
    },
  });

  return NextResponse.json(member);
}

// PUT: Rename a member
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, note } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const member = await prisma.pc_p_group_members.findUnique({ where: { id } });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: { name?: string; note?: string | null } = {};
  if (name !== undefined) updateData.name = name;
  if (note !== undefined) updateData.note = note || null;

  const updated = await prisma.pc_p_group_members.update({
    where: { id },
    data: updateData,
  });

  await prisma.pc_audit_logs.create({
    data: {
      action: "rename_member",
      actorId: session.id,
      entityType: "pc_p_group_members",
      entityId: id,
      oldValue: JSON.stringify({ name: member.name }),
      newValue: JSON.stringify({ name }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE: Soft-delete (deactivate) a member
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  const member = await prisma.pc_p_group_members.findUnique({ where: { id } });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auth check
  const group = await prisma.pc_p_groups.findUnique({ where: { id: member.pGroupId } });
  if (session.role === "B_ACCOUNT" && group?.bAccountId !== session.bAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Soft delete — mark inactive so historical entries are preserved
  const updated = await prisma.pc_p_group_members.update({
    where: { id },
    data: { isActive: false },
  });

  await prisma.pc_audit_logs.create({
    data: {
      action: "deactivate_member",
      actorId: session.id,
      entityType: "pc_p_group_members",
      entityId: id,
      oldValue: JSON.stringify({ name: member.name, isActive: true }),
      newValue: JSON.stringify({ isActive: false }),
    },
  });

  return NextResponse.json(updated);
}
