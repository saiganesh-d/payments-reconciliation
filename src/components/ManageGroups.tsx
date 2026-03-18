"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Pencil, Check, X, Users, ChevronDown,
  ArrowLeft, UserPlus, FolderPlus, Loader2, StickyNote,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  name: string;
  note: string | null;
  isActive: boolean;
}

interface Group {
  id: string;
  name: string;
  members: Member[];
}

export default function ManageGroups({
  bAccountId,
  isMaster,
}: {
  bAccountId: string;
  isMaster: boolean;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // New group
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Edit group name
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");

  // New member
  const [addingMemberGroupId, setAddingMemberGroupId] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberNote, setNewMemberNote] = useState("");
  const [creatingMember, setCreatingMember] = useState(false);

  // Edit member
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberNote, setEditMemberNote] = useState("");

  const [error, setError] = useState("");
  const router = useRouter();

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/p-groups?bAccountId=${bAccountId}`);
      const data = await res.json();
      setGroups(data);
    } catch {
      setError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [bAccountId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    setError("");
    const trimmed = newGroupName.trim();
    try {
      const res = await fetch("/api/admin/p-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bAccountId, name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      const created = await res.json();
      // Optimistic: add to list without refetching
      setGroups((prev) => [...prev, { id: created.id, name: trimmed, members: [] }]);
      setNewGroupName("");
      setShowNewGroup(false);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleRenameGroup = async (id: string) => {
    if (!editGroupName.trim()) return;
    setError("");
    const trimmed = editGroupName.trim();

    // Optimistic update
    const previousGroups = groups;
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, name: trimmed } : g));
    setEditingGroupId(null);

    const res = await fetch("/api/admin/p-groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: trimmed }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setGroups(previousGroups); // rollback
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Delete group "${name}"? This cannot be undone.`)) return;
    setError("");

    // Optimistic: remove from UI immediately
    const previousGroups = groups;
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (expandedGroup === id) setExpandedGroup(null);

    const res = await fetch("/api/admin/p-groups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setGroups(previousGroups); // rollback
    }
  };

  const handleAddMember = async (pGroupId: string) => {
    if (!newMemberName.trim()) return;
    setCreatingMember(true);
    setError("");
    const trimmedName = newMemberName.trim();
    const trimmedNote = newMemberNote.trim() || null;
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pGroupId, name: trimmedName, note: trimmedNote || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      const created = await res.json();
      // Optimistic: add member to group without refetching
      setGroups((prev) =>
        prev.map((g) =>
          g.id === pGroupId
            ? { ...g, members: [...g.members, { id: created.id, name: trimmedName, note: trimmedNote, isActive: true }] }
            : g
        )
      );
      setNewMemberName("");
      setNewMemberNote("");
      setAddingMemberGroupId(null);
    } finally {
      setCreatingMember(false);
    }
  };

  const handleRenameMember = async (id: string) => {
    if (!editMemberName.trim()) return;
    setError("");
    const trimmedName = editMemberName.trim();
    const trimmedNote = editMemberNote.trim() || null;

    // Optimistic update
    const previousGroups = groups;
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        members: g.members.map((m) =>
          m.id === id ? { ...m, name: trimmedName, note: trimmedNote } : m
        ),
      }))
    );
    setEditingMemberId(null);

    const res = await fetch("/api/admin/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: trimmedName, note: trimmedNote }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setGroups(previousGroups); // rollback
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from this group? Historical entries will be preserved.`)) return;
    setError("");

    // Optimistic: remove member from UI immediately
    const previousGroups = groups;
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        members: g.members.map((m) =>
          m.id === id ? { ...m, isActive: false } : m
        ),
      }))
    );

    const res = await fetch("/api/admin/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setGroups(previousGroups); // rollback
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 shimmer bg-surface rounded-xl" />
        <div className="h-20 shimmer bg-surface rounded-2xl" />
        <div className="h-20 shimmer bg-surface rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(isMaster ? "/master" : "/dashboard")}
            className="p-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>
              Manage Groups
            </h1>
            <p className="text-xs text-muted">Add, edit, or remove P-groups and members</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewGroup(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-background text-sm font-semibold hover:bg-accent/90 transition-colors"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <FolderPlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Group</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="text-danger/60 hover:text-danger">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New Group Input */}
      <AnimatePresence>
        {showNewGroup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-4 flex items-center gap-3">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name (e.g. P6)"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                autoFocus
              />
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !newGroupName.trim()}
                className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 disabled:opacity-30 transition-colors"
              >
                {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setShowNewGroup(false); setNewGroupName(""); }}
                className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Groups List */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isExpanded = expandedGroup === group.id;
          const activeMembers = group.members.filter((m) => m.isActive);

          return (
            <div key={group.id} className="glass-card overflow-hidden">
              {/* Group Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                  className="flex items-center gap-3 flex-1"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-accent">{group.name}</span>
                  </div>
                  <div className="text-left">
                    {editingGroupId === group.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editGroupName}
                          onChange={(e) => setEditGroupName(e.target.value)}
                          className="bg-background border border-border rounded px-2 py-1 text-sm w-24 focus:outline-none focus:border-accent/50"
                          onKeyDown={(e) => e.key === "Enter" && handleRenameGroup(group.id)}
                          autoFocus
                        />
                        <button onClick={() => handleRenameGroup(group.id)} className="text-success">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingGroupId(null)} className="text-danger">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium">{group.name} Group</span>
                        <span className="text-xs text-muted ml-2 flex items-center gap-1 inline-flex">
                          <Users className="w-3 h-3" />
                          {activeMembers.length} members
                        </span>
                      </>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingGroupId(group.id);
                      setEditGroupName(group.name);
                    }}
                    className="p-2 text-muted hover:text-accent transition-colors rounded-lg hover:bg-accent/10"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {isMaster && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.id, group.name);
                      }}
                      className="p-2 text-muted hover:text-danger transition-colors rounded-lg hover:bg-danger/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-muted" />
                  </motion.div>
                </div>
              </div>

              {/* Members */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border px-4 py-3 space-y-2">
                      {activeMembers.map((member) => (
                        <div
                          key={member.id}
                          className="py-2 px-3 bg-background rounded-lg"
                        >
                          {editingMemberId === member.id ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editMemberName}
                                  onChange={(e) => setEditMemberName(e.target.value)}
                                  placeholder="Name"
                                  className="bg-surface border border-border rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:border-accent/50"
                                  onKeyDown={(e) => e.key === "Enter" && handleRenameMember(member.id)}
                                  autoFocus
                                />
                                <button onClick={() => handleRenameMember(member.id)} className="text-success p-1">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingMemberId(null)} className="text-danger p-1">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <input
                                type="text"
                                value={editMemberNote}
                                onChange={(e) => setEditMemberNote(e.target.value)}
                                placeholder="Note (optional) — e.g. area, role, phone..."
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-muted focus:outline-none focus:border-accent/50 focus:text-foreground"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{member.name}</span>
                                {member.note && (
                                  <span className="text-[10px] text-muted bg-surface px-1.5 py-0.5 rounded max-w-[150px] truncate" title={member.note}>
                                    <StickyNote className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
                                    {member.note}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setEditingMemberId(member.id); setEditMemberName(member.name); setEditMemberNote(member.note || ""); }}
                                  className="p-1.5 text-muted hover:text-accent rounded hover:bg-accent/10 transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(member.id, member.name)}
                                  className="p-1.5 text-muted hover:text-danger rounded hover:bg-danger/10 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {activeMembers.length === 0 && (
                        <p className="text-xs text-muted text-center py-3">No members yet</p>
                      )}

                      {/* Add Member */}
                      {addingMemberGroupId === group.id ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newMemberName}
                              onChange={(e) => setNewMemberName(e.target.value)}
                              placeholder="Member name"
                              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
                              onKeyDown={(e) => e.key === "Enter" && handleAddMember(group.id)}
                              autoFocus
                            />
                            <button
                              onClick={() => handleAddMember(group.id)}
                              disabled={creatingMember || !newMemberName.trim()}
                              className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 disabled:opacity-30"
                            >
                              {creatingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => { setAddingMemberGroupId(null); setNewMemberName(""); setNewMemberNote(""); }}
                              className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={newMemberNote}
                            onChange={(e) => setNewMemberNote(e.target.value)}
                            placeholder="Note (optional) — e.g. area, role, phone..."
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-muted focus:outline-none focus:border-accent/50 focus:text-foreground"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingMemberGroupId(group.id)}
                          className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 py-2 transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add Member
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="text-center py-12 text-muted">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No groups yet. Create your first group above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
