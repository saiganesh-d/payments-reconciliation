"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Building2, Plus, Pencil, Trash2, Check, X,
  ChevronDown, Loader2, Settings, Hash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ManageGroups from "./ManageGroups";

interface BAccount {
  id: string;
  name: string;
  pGroupCount: number;
  nNameCount: number;
}

interface NName {
  id: string;
  name: string;
  isActive: boolean;
}

export default function MasterManage() {
  const [bAccounts, setBAccounts] = useState<BAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBA, setSelectedBA] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"groups" | "nnames">("groups");
  const router = useRouter();

  // N-names state
  const [nNames, setNNames] = useState<NName[]>([]);
  const [loadingN, setLoadingN] = useState(false);
  const [showNewN, setShowNewN] = useState(false);
  const [newNName, setNewNName] = useState("");
  const [creatingN, setCreatingN] = useState(false);
  const [editingNId, setEditingNId] = useState<string | null>(null);
  const [editNName, setEditNName] = useState("");
  const [error, setError] = useState("");

  const fetchBAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/master/b-accounts?date=${today}`);
      const data = await res.json();
      setBAccounts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNNames = useCallback(async (bAccountId: string) => {
    setLoadingN(true);
    try {
      const res = await fetch(`/api/admin/n-names?bAccountId=${bAccountId}`);
      const data = await res.json();
      setNNames(data);
    } finally {
      setLoadingN(false);
    }
  }, []);

  useEffect(() => {
    fetchBAccounts();
  }, [fetchBAccounts]);

  useEffect(() => {
    if (selectedBA && activeTab === "nnames") {
      fetchNNames(selectedBA);
    }
  }, [selectedBA, activeTab, fetchNNames]);

  const handleCreateN = async () => {
    if (!newNName.trim() || !selectedBA) return;
    setCreatingN(true);
    setError("");
    try {
      const res = await fetch("/api/admin/n-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bAccountId: selectedBA, name: newNName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      setNewNName("");
      setShowNewN(false);
      fetchNNames(selectedBA);
    } finally {
      setCreatingN(false);
    }
  };

  const handleRenameN = async (id: string) => {
    if (!editNName.trim()) return;
    setError("");
    const res = await fetch("/api/admin/n-names", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editNName.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }
    setEditingNId(null);
    if (selectedBA) fetchNNames(selectedBA);
  };

  const handleDeleteN = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"? Historical entries will be preserved.`)) return;
    setError("");
    const res = await fetch("/api/admin/n-names", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }
    if (selectedBA) fetchNNames(selectedBA);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 shimmer bg-surface rounded-xl" />
        <div className="h-20 shimmer bg-surface rounded-2xl" />
      </div>
    );
  }

  if (selectedBA) {
    const currentTab = activeTab;
    const activeNNames = nNames.filter((n) => n.isActive);
    const baName = bAccounts.find((b) => b.id === selectedBA)?.name;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedBA(null)}
              className="p-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>
                {baName} — Manage
              </h1>
              <p className="text-xs text-muted">Groups & N-Names</p>
            </div>
          </div>
          {currentTab === "nnames" && (
            <button
              onClick={() => setShowNewN(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-background text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add N-Name</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              currentTab === "groups" ? "bg-accent text-background" : "text-muted hover:text-foreground"
            }`}
          >
            P-Groups
          </button>
          <button
            onClick={() => setActiveTab("nnames")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              currentTab === "nnames" ? "bg-accent text-background" : "text-muted hover:text-foreground"
            }`}
          >
            N-Names
          </button>
        </div>

        {currentTab === "groups" && (
          <ManageGroups bAccountId={selectedBA} isMaster={true} />
        )}

        {currentTab === "nnames" && (
          <>
            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger flex items-center justify-between">
                {error}
                <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* New N-Name */}
            <AnimatePresence>
              {showNewN && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="glass-card p-4 flex items-center gap-3">
                    <input
                      type="text"
                      value={newNName}
                      onChange={(e) => setNewNName(e.target.value)}
                      placeholder="N-Name (e.g. N5)"
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
                      onKeyDown={(e) => e.key === "Enter" && handleCreateN()}
                      autoFocus
                    />
                    <button
                      onClick={handleCreateN}
                      disabled={creatingN || !newNName.trim()}
                      className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 disabled:opacity-30"
                    >
                      {creatingN ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setShowNewN(false); setNewNName(""); }}
                      className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* N-Names List */}
            {loadingN ? (
              <div className="space-y-2">
                <div className="h-14 shimmer bg-surface rounded-xl" />
                <div className="h-14 shimmer bg-surface rounded-xl" />
              </div>
            ) : (
              <div className="space-y-2">
                {activeNNames.map((nName) => (
                  <div key={nName.id} className="glass-card flex items-center justify-between px-4 py-3">
                {editingNId === nName.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editNName}
                      onChange={(e) => setEditNName(e.target.value)}
                      className="bg-background border border-border rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:border-accent/50"
                      onKeyDown={(e) => e.key === "Enter" && handleRenameN(nName.id)}
                      autoFocus
                    />
                    <button onClick={() => handleRenameN(nName.id)} className="text-success p-1.5">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingNId(null)} className="text-danger p-1.5">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Hash className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <span className="text-sm font-medium">{nName.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingNId(nName.id); setEditNName(nName.name); }}
                        className="p-2 text-muted hover:text-accent rounded-lg hover:bg-accent/10 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteN(nName.id, nName.name)}
                        className="p-2 text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {activeNNames.length === 0 && (
              <div className="text-center py-12 text-muted">
                <Hash className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No N-names yet. Add your first one above.</p>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    );
  }

  // B-Account selection
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/master")}
          className="p-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>
            Admin — Manage
          </h1>
          <p className="text-xs text-muted">Select an account to manage groups and N-names</p>
        </div>
      </div>

      <div className="space-y-3">
        {bAccounts.map((ba, i) => (
          <motion.button
            key={ba.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => { setSelectedBA(ba.id); setActiveTab("groups"); }}
            className="w-full glass-card p-5 text-left hover:border-accent/30 transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {ba.name}
                </h3>
                <p className="text-xs text-muted">
                  {ba.pGroupCount} groups · {ba.nNameCount} N-names
                </p>
              </div>
            </div>
            <Settings className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
