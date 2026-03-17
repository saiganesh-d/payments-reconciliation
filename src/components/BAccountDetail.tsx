"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, Lock, Unlock, IndianRupee, Save, Info, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import DateNavigation from "./DateNavigation";
import ReconciliationBox from "./ReconciliationBox";
import { getISTDate, formatCurrency } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  note?: string | null;
}

interface Group {
  id: string;
  name: string;
  members: Member[];
}

interface NName {
  id: string;
  name: string;
}

interface BAccount {
  id: string;
  name: string;
  pGroups: Group[];
  nNames: NName[];
}

interface Entry {
  id: string;
  memberId: string;
  pGroupId: string;
  amount: number;
  isLocked: boolean;
}

interface NEntry {
  nNameId: string;
  amount: number;
}

interface GroupSubmission {
  pGroupId: string;
  status: string;
}

export default function BAccountDetail({
  bAccountId,
  initialDate,
}: {
  bAccountId: string;
  initialDate?: string;
}) {
  const todayDate = getISTDate();
  const [currentDate, setCurrentDate] = useState(initialDate || todayDate);
  const [bAccount, setBAccount] = useState<BAccount | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nEntries, setNEntries] = useState<NEntry[]>([]);
  const [groupSubmissions, setGroupSubmissions] = useState<GroupSubmission[]>([]);
  const [daySubmission, setDaySubmission] = useState<{ status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [nAmounts, setNAmounts] = useState<Record<string, number>>({});
  const [savingN, setSavingN] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pgroups" | "nnames">("pgroups");
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/master/b-account-detail?bAccountId=${bAccountId}&date=${currentDate}`
      );
      const data = await res.json();
      setBAccount(data.bAccount);
      setEntries(data.entries || []);
      setNEntries(data.nEntries || []);
      setGroupSubmissions(data.groupSubmissions || []);
      setDaySubmission(data.daySubmission || null);

      // Initialize N-amounts from existing entries
      const amounts: Record<string, number> = {};
      (data.nEntries || []).forEach((ne: NEntry) => {
        amounts[ne.nNameId] = ne.amount;
      });
      setNAmounts(amounts);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [bAccountId, currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveNEntry = async (nNameId: string) => {
    setSavingN(nNameId);
    try {
      await fetch("/api/master/n-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: currentDate,
          bAccountId,
          nNameId,
          amount: nAmounts[nNameId] || 0,
        }),
      });

      setNEntries((prev) => {
        const existing = prev.find((e) => e.nNameId === nNameId);
        if (existing) {
          return prev.map((e) =>
            e.nNameId === nNameId ? { ...e, amount: nAmounts[nNameId] || 0 } : e
          );
        }
        return [...prev, { nNameId, amount: nAmounts[nNameId] || 0 }];
      });
    } finally {
      setSavingN(null);
    }
  };

  const handleUnlock = async (entryId: string) => {
    if (!confirm("Unlock this entry? The B-account user will need to re-lock it.")) return;

    const res = await fetch("/api/entries/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId }),
    });

    if (res.ok) {
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 shimmer bg-surface rounded-xl" />
        <div className="h-40 shimmer bg-surface rounded-2xl" />
        <div className="h-60 shimmer bg-surface rounded-2xl" />
      </div>
    );
  }

  if (!bAccount) {
    return <div className="text-center text-muted py-12">Account not found</div>;
  }

  const pTotal = entries.reduce((sum, e) => sum + e.amount, 0);
  const nTotal = Object.values(nAmounts).reduce((sum, a) => sum + (a || 0), 0);
  const submittedGroupIds = groupSubmissions
    .filter((s) => s.status === "SUBMITTED")
    .map((s) => s.pGroupId);
  const allGroupsSubmitted = bAccount.pGroups.length > 0 && submittedGroupIds.length === bAccount.pGroups.length;

  return (
    <div className="space-y-5">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/master")}
          className="p-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {bAccount.name}
          </h1>
          <p className="text-xs text-muted">Account Detail</p>
        </div>
      </div>

      {/* Date Navigation */}
      <DateNavigation
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        todayDate={todayDate}
      />

      {/* Reconciliation */}
      <ReconciliationBox
        pGroupTotal={pTotal}
        nNameTotal={nTotal}
        isComplete={allGroupsSubmitted}
      />

      {/* Tabs: P-Groups / N-Names */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border">
        <button
          onClick={() => setActiveTab("pgroups")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "pgroups" ? "bg-accent text-background" : "text-muted hover:text-foreground"
          }`}
        >
          P-Groups ({bAccount.pGroups.length})
        </button>
        <button
          onClick={() => setActiveTab("nnames")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "nnames" ? "bg-accent text-background" : "text-muted hover:text-foreground"
          }`}
        >
          N-Names ({bAccount.nNames.length})
        </button>
      </div>

      {/* P-Groups Status — collapsible */}
      {activeTab === "pgroups" && (
        <div className="glass-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
              P-Groups Status
            </h3>
            <span className="text-xs text-muted">
              {submittedGroupIds.length}/{bAccount.pGroups.length} submitted
            </span>
          </div>
          <div className="space-y-2">
            {bAccount.pGroups.map((group) => {
              const isSubmitted = submittedGroupIds.includes(group.id);
              const groupEntries = entries.filter((e) => e.pGroupId === group.id);
              const groupTotal = groupEntries.reduce((sum, e) => sum + e.amount, 0);
              const isExpanded = expandedGroupId === group.id;

              return (
                <div key={group.id} className="bg-background rounded-xl overflow-hidden">
                  {/* Group header — clickable */}
                  <button
                    onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSubmitted ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
                      }`}>
                        {group.name}
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium">{group.name}</span>
                        <span className="text-xs text-muted ml-2">
                          {group.members.length} members
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(groupTotal)}</span>
                      {isSubmitted ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : groupEntries.length > 0 ? (
                        <Clock className="w-4 h-4 text-warning" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-muted" />
                      )}
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4 text-muted" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Group member details — collapsible */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/50 px-4 py-2 space-y-1">
                          {group.members.map((member) => {
                            const entry = groupEntries.find((e) => e.memberId === member.id);
                            return (
                              <div key={member.id} className="flex items-center justify-between py-1.5 text-xs">
                                <span className="flex items-center gap-1">
                                  {member.name}
                                  {member.note && (
                                    <span className="relative group/tip inline-flex cursor-help">
                                      <Info className="w-3 h-3 text-muted/50 hover:text-accent transition-colors" />
                                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/tip:block z-50 px-2.5 py-1.5 rounded-lg bg-surface border border-border shadow-xl text-[10px] text-foreground whitespace-nowrap">
                                        {member.note}
                                      </span>
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${entry?.amount ? "text-foreground" : "text-muted"}`}>
                                    {entry?.amount ? formatCurrency(entry.amount) : "—"}
                                  </span>
                                  {entry?.isLocked ? (
                                    <button
                                      onClick={() => handleUnlock(entry.id)}
                                      className="p-1 rounded text-success hover:text-warning hover:bg-warning/10 transition-colors"
                                      title="Click to unlock"
                                    >
                                      <Lock className="w-3 h-3" />
                                    </button>
                                  ) : entry ? (
                                    <Unlock className="w-3 h-3 text-muted" />
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* N-Names Entry */}
      {activeTab === "nnames" && (
      <div className="glass-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
          N-Names — Master Entries
        </h3>
        <div className="space-y-2">
          {bAccount.nNames.map((nName) => {
            const currentAmount = nAmounts[nName.id] ?? 0;
            const savedEntry = nEntries.find((e) => e.nNameId === nName.id);
            const hasUnsavedChanges = savedEntry ? savedEntry.amount !== currentAmount : currentAmount > 0;

            return (
              <div key={nName.id} className="flex items-center gap-3 p-3 bg-background rounded-xl">
                <span className="text-sm font-medium flex-1">{nName.name}</span>
                <div className="relative w-28 sm:w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">₹</span>
                  <input
                    type="number"
                    value={currentAmount || ""}
                    onChange={(e) =>
                      setNAmounts((prev) => ({
                        ...prev,
                        [nName.id]: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 rounded-lg text-sm text-right font-medium bg-surface border border-border focus:border-accent/50 focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all"
                  />
                </div>
                <button
                  onClick={() => handleSaveNEntry(nName.id)}
                  disabled={savingN === nName.id}
                  className={`p-2 rounded-lg transition-all ${
                    hasUnsavedChanges
                      ? "bg-accent/10 text-accent hover:bg-accent/20"
                      : "bg-surface text-muted"
                  }`}
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {bAccount.nNames.length === 0 && (
            <p className="text-xs text-muted text-center py-4">No N-names configured</p>
          )}
        </div>

        {bAccount.nNames.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted">N-Names Total</span>
            <span className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {formatCurrency(nTotal)}
            </span>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
