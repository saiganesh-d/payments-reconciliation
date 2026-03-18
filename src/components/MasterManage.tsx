"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Building2, Plus, Pencil, Trash2, Check, X,
  Loader2, Settings, Hash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ManageGroups from "./ManageGroups";

interface BAccount {
  id: string;
  name: string;
  pGroupCount: number;
  nNameCount: number;
  qNameCount: number;
}

interface NName {
  id: string;
  name: string;
  isActive: boolean;
}

interface QName {
  id: string;
  name: string;
  isActive: boolean;
}

export default function MasterManage() {
  const [bAccounts, setBAccounts] = useState<BAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBA, setSelectedBA] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"groups" | "nnames" | "qnames">("groups");
  const router = useRouter();

  // N-names state
  const [nNames, setNNames] = useState<NName[]>([]);
  const [loadingN, setLoadingN] = useState(false);
  const [showNewN, setShowNewN] = useState(false);
  const [newNName, setNewNName] = useState("");
  const [creatingN, setCreatingN] = useState(false);
  const [editingNId, setEditingNId] = useState<string | null>(null);
  const [editNName, setEditNName] = useState("");

  // Q-names state
  const [qNames, setQNames] = useState<QName[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [showNewQ, setShowNewQ] = useState(false);
  const [newQName, setNewQName] = useState("");
  const [creatingQ, setCreatingQ] = useState(false);
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [editQName, setEditQName] = useState("");

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

  const fetchQNames = useCallback(async (bAccountId: string) => {
    setLoadingQ(true);
    try {
      const res = await fetch(`/api/admin/q-names?bAccountId=${bAccountId}`);
      const data = await res.json();
      setQNames(data);
    } finally {
      setLoadingQ(false);
    }
  }, []);

  useEffect(() => {
    fetchBAccounts();
  }, [fetchBAccounts]);

  useEffect(() => {
    if (selectedBA && activeTab === "nnames") {
      fetchNNames(selectedBA);
    }
    if (selectedBA && activeTab === "qnames") {
      fetchQNames(selectedBA);
    }
  }, [selectedBA, activeTab, fetchNNames, fetchQNames]);

  // N-name handlers
  const handleCreateN = async () => {
    if (!newNName.trim() || !selectedBA) return;
    setCreatingN(true);
    setError("");
    const trimmed = newNName.trim();
    try {
      const res = await fetch("/api/admin/n-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bAccountId: selectedBA, name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      const created = await res.json();
      setNNames((prev) => [...prev, { id: created.id, name: trimmed, isActive: true }]);
      setNewNName("");
      setShowNewN(false);
    } finally {
      setCreatingN(false);
    }
  };

  const handleRenameN = async (id: string) => {
    if (!editNName.trim()) return;
    setError("");
    const trimmed = editNName.trim();
    const previousNNames = nNames;
    setNNames((prev) => prev.map((n) => n.id === id ? { ...n, name: trimmed } : n));
    setEditingNId(null);

    const res = await fetch("/api/admin/n-names", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: trimmed }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setNNames(previousNNames);
    }
  };

  const handleDeleteN = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"? Historical entries will be preserved.`)) return;
    setError("");
    const previousNNames = nNames;
    setNNames((prev) => prev.map((n) => n.id === id ? { ...n, isActive: false } : n));

    const res = await fetch("/api/admin/n-names", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setNNames(previousNNames);
    }
  };

  // Q-name handlers
  const handleCreateQ = async () => {
    if (!newQName.trim() || !selectedBA) return;
    setCreatingQ(true);
    setError("");
    const trimmed = newQName.trim();
    try {
      const res = await fetch("/api/admin/q-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bAccountId: selectedBA, name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      const created = await res.json();
      setQNames((prev) => [...prev, { id: created.id, name: trimmed, isActive: true }]);
      setNewQName("");
      setShowNewQ(false);
    } finally {
      setCreatingQ(false);
    }
  };

  const handleRenameQ = async (id: string) => {
    if (!editQName.trim()) return;
    setError("");
    const trimmed = editQName.trim();
    const previousQNames = qNames;
    setQNames((prev) => prev.map((q) => q.id === id ? { ...q, name: trimmed } : q));
    setEditingQId(null);

    const res = await fetch("/api/admin/q-names", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: trimmed }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setQNames(previousQNames);
    }
  };

  const handleDeleteQ = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"? Historical entries will be preserved.`)) return;
    setError("");
    const previousQNames = qNames;
    setQNames((prev) => prev.map((q) => q.id === id ? { ...q, isActive: false } : q));

    const res = await fetch("/api/admin/q-names", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setQNames(previousQNames);
    }
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
    const activeQNames = qNames.filter((q) => q.isActive);
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
              <p className="text-xs text-muted">Groups, N-Names & Q-Names</p>
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
          {currentTab === "qnames" && (
            <button
              onClick={() => setShowNewQ(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-background text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Q-Name</span>
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
          <button
            onClick={() => setActiveTab("qnames")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              currentTab === "qnames" ? "bg-accent text-background" : "text-muted hover:text-foreground"
            }`}
          >
            Q-Names
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

        {currentTab === "qnames" && (
          <>
            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger flex items-center justify-between">
                {error}
                <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
              </div>
            )}

            <AnimatePresence>
              {showNewQ && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="glass-card p-4 flex items-center gap-3">
                    <input
                      type="text"
                      value={newQName}
                      onChange={(e) => setNewQName(e.target.value)}
                      placeholder="Q-Name (e.g. Q1)"
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
                      onKeyDown={(e) => e.key === "Enter" && handleCreateQ()}
                      autoFocus
                    />
                    <button
                      onClick={handleCreateQ}
                      disabled={creatingQ || !newQName.trim()}
                      className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 disabled:opacity-30"
                    >
                      {creatingQ ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setShowNewQ(false); setNewQName(""); }}
                      className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loadingQ ? (
              <div className="space-y-2">
                <div className="h-14 shimmer bg-surface rounded-xl" />
                <div className="h-14 shimmer bg-surface rounded-xl" />
              </div>
            ) : (
              <div className="space-y-2">
                {activeQNames.map((qName) => (
                  <div key={qName.id} className="glass-card flex items-center justify-between px-4 py-3">
                    {editingQId === qName.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editQName}
                          onChange={(e) => setEditQName(e.target.value)}
                          className="bg-background border border-border rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:border-accent/50"
                          onKeyDown={(e) => e.key === "Enter" && handleRenameQ(qName.id)}
                          autoFocus
                        />
                        <button onClick={() => handleRenameQ(qName.id)} className="text-success p-1.5">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingQId(null)} className="text-danger p-1.5">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                            <Hash className="w-3.5 h-3.5 text-warning" />
                          </div>
                          <span className="text-sm font-medium">{qName.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingQId(qName.id); setEditQName(qName.name); }}
                            className="p-2 text-muted hover:text-accent rounded-lg hover:bg-accent/10 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQ(qName.id, qName.name)}
                            className="p-2 text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {activeQNames.length === 0 && (
                  <div className="text-center py-12 text-muted">
                    <Hash className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No Q-names yet. Add your first one above.</p>
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
          <p className="text-xs text-muted">Select an account to manage groups, N-names & Q-names</p>
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
                  {ba.pGroupCount} groups · {ba.nNameCount} N-names · {ba.qNameCount} Q-names
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
