"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, Lock, Unlock, Save, Info, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import DateNavigation from "./DateNavigation";
import ReconciliationBox from "./ReconciliationBox";
import { getISTDate, formatCurrency } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";

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

interface QName {
  id: string;
  name: string;
}

interface BAccount {
  id: string;
  name: string;
  pGroups: Group[];
  nNames: NName[];
  qNames: QName[];
}

interface Entry {
  id: string;
  memberId: string;
  pGroupId: string;
  amount: number;
  isLocked: boolean;
  version: number;
}

interface NEntry {
  id?: string;
  nNameId: string;
  isLocked?: boolean;
  amount: number;
}

interface QEntry {
  id?: string;
  qNameId: string;
  isLocked?: boolean;
  amount: number;
}

interface GroupSubmission {
  pGroupId: string;
  status: string;
  version: number;
}

interface DaySubmission {
  status: string;
  version: number;
}

interface DetailData {
  bAccount: BAccount;
  entries: Entry[];
  nEntries: NEntry[];
  qEntries: QEntry[];
  groupSubmissions: GroupSubmission[];
  daySubmissions: DaySubmission[];
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
  const [nAmounts, setNAmounts] = useState<Record<string, number>>({});
  const [qAmounts, setQAmounts] = useState<Record<string, number>>({});
  const [savingN, setSavingN] = useState<string | null>(null);
  const [savingQ, setSavingQ] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pgroups" | "nnames" | "qnames">("pgroups");
  const [selectedVersion, setSelectedVersion] = useState(1);
  const router = useRouter();

  const detailKey = `/api/master/b-account-detail?bAccountId=${bAccountId}&date=${currentDate}`;
  const { data, isLoading, mutate: mutateDetail } = useSWR<DetailData>(detailKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const bAccount = data?.bAccount || null;
  const entries = data?.entries || [];
  const nEntries = data?.nEntries || [];
  const qEntries = data?.qEntries || [];
  const groupSubmissions = data?.groupSubmissions || [];
  const daySubmissions = data?.daySubmissions || [];

  // Sync nAmounts when data loads
  useEffect(() => {
    if (data?.nEntries) {
      const amounts: Record<string, number> = {};
      data.nEntries.forEach((ne) => {
        amounts[ne.nNameId] = ne.amount;
      });
      setNAmounts(amounts);
    }
  }, [data?.nEntries]);

  // Sync qAmounts when data loads
  useEffect(() => {
    if (data?.qEntries) {
      const amounts: Record<string, number> = {};
      data.qEntries.forEach((qe) => {
        amounts[qe.qNameId] = qe.amount;
      });
      setQAmounts(amounts);
    }
  }, [data?.qEntries]);

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

      mutateDetail(
        (prev) => {
          if (!prev) return prev;
          const existing = prev.nEntries.find((e) => e.nNameId === nNameId);
          const newNEntries = existing
            ? prev.nEntries.map((e) =>
                e.nNameId === nNameId ? { ...e, amount: nAmounts[nNameId] || 0 } : e
              )
            : [...prev.nEntries, { nNameId, amount: nAmounts[nNameId] || 0 }];
          return { ...prev, nEntries: newNEntries };
        },
        { revalidate: false }
      );
    } finally {
      setSavingN(null);
    }
  };

  const handleNLock = async (nNameId: string, action: "lock" | "unlock") => {
    const res = await fetch("/api/master/n-entries/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: currentDate, nNameId, action }),
    });

    if (res.ok) {
      mutateDetail(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            nEntries: prev.nEntries.map((e) =>
              e.nNameId === nNameId ? { ...e, isLocked: action === "lock" } : e
            ),
          };
        },
        { revalidate: false }
      );
    }
  };

  const handleSaveQEntry = async (qNameId: string) => {
    setSavingQ(qNameId);
    try {
      await fetch("/api/master/q-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: currentDate,
          bAccountId,
          qNameId,
          amount: qAmounts[qNameId] || 0,
        }),
      });

      mutateDetail(
        (prev) => {
          if (!prev) return prev;
          const existing = prev.qEntries.find((e) => e.qNameId === qNameId);
          const newQEntries = existing
            ? prev.qEntries.map((e) =>
                e.qNameId === qNameId ? { ...e, amount: qAmounts[qNameId] || 0 } : e
              )
            : [...prev.qEntries, { qNameId, amount: qAmounts[qNameId] || 0 }];
          return { ...prev, qEntries: newQEntries };
        },
        { revalidate: false }
      );
    } finally {
      setSavingQ(null);
    }
  };

  const handleQLock = async (qNameId: string, action: "lock" | "unlock") => {
    const res = await fetch("/api/master/q-entries/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: currentDate, qNameId, action }),
    });

    if (res.ok) {
      mutateDetail(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            qEntries: prev.qEntries.map((e) =>
              e.qNameId === qNameId ? { ...e, isLocked: action === "lock" } : e
            ),
          };
        },
        { revalidate: false }
      );
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
      mutateDetail();
    }
  };

  if (isLoading) {
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

  // P-total sums ALL versions for reconciliation
  const pTotal = entries.reduce((sum, e) => sum + e.amount, 0);
  const nTotal = Object.values(nAmounts).reduce((sum, a) => sum + (a || 0), 0);
  const qTotal = Object.values(qAmounts).reduce((sum, a) => sum + (a || 0), 0);

  // Filter entries by selected version for P-groups display
  const versionEntries = entries.filter((e) => e.version === selectedVersion);
  const versionGroupSubs = groupSubmissions.filter((s) => s.version === selectedVersion);

  const submittedGroupIds = versionGroupSubs
    .filter((s) => s.status === "SUBMITTED")
    .map((s) => s.pGroupId);
  const allGroupsSubmitted = bAccount.pGroups.length > 0 && submittedGroupIds.length === bAccount.pGroups.length;

  // Version statuses from daySubmissions
  const getVersionStatus = (v: number) => {
    const ds = daySubmissions.find((d) => d.version === v);
    return ds?.status || "NOT_STARTED";
  };

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
        onDateChange={(d) => { setCurrentDate(d); setSelectedVersion(1); }}
        todayDate={todayDate}
      />

      {/* Reconciliation */}
      <ReconciliationBox
        pGroupTotal={pTotal}
        nNameTotal={nTotal}
        qNameTotal={qTotal}
        isComplete={allGroupsSubmitted}
      />

      {/* Tabs: P-Groups / N-Names / Q-Names */}
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
        <button
          onClick={() => setActiveTab("qnames")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "qnames" ? "bg-accent text-background" : "text-muted hover:text-foreground"
          }`}
        >
          Q-Names ({bAccount.qNames.length})
        </button>
      </div>

      {/* P-Groups Status — with version selector */}
      {activeTab === "pgroups" && (
        <div className="glass-card p-4 sm:p-5">
          {/* Version pills */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-muted font-medium uppercase tracking-wider">Version:</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((v) => {
                const status = getVersionStatus(v);
                const isFinalized = status === "FINALIZED";
                return (
                  <button
                    key={v}
                    onClick={() => setSelectedVersion(v)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      selectedVersion === v
                        ? "bg-accent text-background"
                        : isFinalized
                          ? "bg-success/10 text-success border border-success/20"
                          : "bg-surface text-muted border border-border hover:text-foreground"
                    }`}
                  >
                    {isFinalized && selectedVersion !== v && <CheckCircle2 className="w-3 h-3" />}
                    V{v}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
              P-Groups Status — V{selectedVersion}
            </h3>
            <span className="text-xs text-muted">
              {submittedGroupIds.length}/{bAccount.pGroups.length} submitted
            </span>
          </div>
          <div className="space-y-2">
            {bAccount.pGroups.map((group) => {
              const isSubmitted = submittedGroupIds.includes(group.id);
              const groupEntries = versionEntries.filter((e) => e.pGroupId === group.id);
              const groupTotal = groupEntries.reduce((sum, e) => sum + e.amount, 0);
              const isExpanded = expandedGroupId === group.id;

              return (
                <div key={group.id} className="bg-background rounded-xl overflow-hidden">
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
            N-Names — Master Entries
          </h3>
          <span className="text-xs text-muted">
            {nEntries.filter((e) => e.isLocked).length}/{bAccount.nNames.length} locked
          </span>
        </div>
        <div className="space-y-2">
          {bAccount.nNames.map((nName) => {
            const currentAmount = nAmounts[nName.id] ?? 0;
            const savedEntry = nEntries.find((e) => e.nNameId === nName.id);
            const isLocked = savedEntry?.isLocked || false;
            const hasUnsavedChanges = savedEntry ? savedEntry.amount !== currentAmount : currentAmount > 0;

            return (
              <div key={nName.id} className={`rounded-xl transition-all ${
                isLocked
                  ? "bg-background border border-success/20"
                  : "bg-background border border-border"
              }`}>
                <div className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="w-[100px] sm:w-[140px] shrink-0">
                    <span className={`text-sm font-medium ${isLocked ? "text-muted" : ""}`}>{nName.name}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative w-full max-w-[200px]">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isLocked ? "text-success/60" : "text-muted"}`}>₹</span>
                      <input
                        type="number"
                        value={currentAmount || ""}
                        onChange={(e) =>
                          setNAmounts((prev) => ({
                            ...prev,
                            [nName.id]: parseInt(e.target.value) || 0,
                          }))
                        }
                        disabled={isLocked}
                        placeholder="0"
                        className={`w-full pl-8 pr-4 py-2.5 rounded-xl text-center text-base font-bold transition-all ${
                          isLocked
                            ? "bg-success/5 text-success border border-success/20 cursor-not-allowed"
                            : currentAmount
                              ? "bg-accent/5 text-accent border border-accent/30 focus:border-accent/60 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                              : "bg-surface border border-border text-foreground focus:border-accent/50 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                        }`}
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      />
                    </div>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => handleSaveNEntry(nName.id)}
                      disabled={savingN === nName.id || !hasUnsavedChanges}
                      className={`p-2.5 rounded-xl transition-all shrink-0 ${
                        hasUnsavedChanges
                          ? "bg-accent/10 text-accent hover:bg-accent/20"
                          : "bg-surface text-muted/40"
                      }`}
                      title="Save"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => isLocked ? handleNLock(nName.id, "unlock") : handleNLock(nName.id, "lock")}
                    disabled={!isLocked && (!savedEntry || hasUnsavedChanges)}
                    className={`p-3 rounded-xl transition-all shrink-0 ${
                      isLocked
                        ? "bg-success/10 text-success hover:bg-warning/10 hover:text-warning"
                        : savedEntry && !hasUnsavedChanges
                          ? "bg-accent/10 text-accent hover:bg-accent/20"
                          : "bg-surface text-muted/30 cursor-not-allowed"
                    }`}
                    title={isLocked ? "Click to unlock" : savedEntry ? "Click to lock" : "Save first"}
                  >
                    {isLocked ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <Unlock className="w-5 h-5" />
                    )}
                  </button>
                </div>
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

      {/* Q-Names Entry */}
      {activeTab === "qnames" && (
      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Q-Names — Master Entries
          </h3>
          <span className="text-xs text-muted">
            {qEntries.filter((e) => e.isLocked).length}/{bAccount.qNames.length} locked
          </span>
        </div>
        <div className="space-y-2">
          {bAccount.qNames.map((qName) => {
            const currentAmount = qAmounts[qName.id] ?? 0;
            const savedEntry = qEntries.find((e) => e.qNameId === qName.id);
            const isLocked = savedEntry?.isLocked || false;
            const hasUnsavedChanges = savedEntry ? savedEntry.amount !== currentAmount : currentAmount > 0;

            return (
              <div key={qName.id} className={`rounded-xl transition-all ${
                isLocked
                  ? "bg-background border border-success/20"
                  : "bg-background border border-border"
              }`}>
                <div className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="w-[100px] sm:w-[140px] shrink-0">
                    <span className={`text-sm font-medium ${isLocked ? "text-muted" : ""}`}>{qName.name}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative w-full max-w-[200px]">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isLocked ? "text-success/60" : "text-muted"}`}>₹</span>
                      <input
                        type="number"
                        value={currentAmount || ""}
                        onChange={(e) =>
                          setQAmounts((prev) => ({
                            ...prev,
                            [qName.id]: parseInt(e.target.value) || 0,
                          }))
                        }
                        disabled={isLocked}
                        placeholder="0"
                        className={`w-full pl-8 pr-4 py-2.5 rounded-xl text-center text-base font-bold transition-all ${
                          isLocked
                            ? "bg-success/5 text-success border border-success/20 cursor-not-allowed"
                            : currentAmount
                              ? "bg-accent/5 text-accent border border-accent/30 focus:border-accent/60 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                              : "bg-surface border border-border text-foreground focus:border-accent/50 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                        }`}
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      />
                    </div>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => handleSaveQEntry(qName.id)}
                      disabled={savingQ === qName.id || !hasUnsavedChanges}
                      className={`p-2.5 rounded-xl transition-all shrink-0 ${
                        hasUnsavedChanges
                          ? "bg-accent/10 text-accent hover:bg-accent/20"
                          : "bg-surface text-muted/40"
                      }`}
                      title="Save"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => isLocked ? handleQLock(qName.id, "unlock") : handleQLock(qName.id, "lock")}
                    disabled={!isLocked && (!savedEntry || hasUnsavedChanges)}
                    className={`p-3 rounded-xl transition-all shrink-0 ${
                      isLocked
                        ? "bg-success/10 text-success hover:bg-warning/10 hover:text-warning"
                        : savedEntry && !hasUnsavedChanges
                          ? "bg-accent/10 text-accent hover:bg-accent/20"
                          : "bg-surface text-muted/30 cursor-not-allowed"
                    }`}
                    title={isLocked ? "Click to unlock" : savedEntry ? "Click to lock" : "Save first"}
                  >
                    {isLocked ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <Unlock className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {bAccount.qNames.length === 0 && (
            <p className="text-xs text-muted text-center py-4">No Q-names configured</p>
          )}
        </div>

        {bAccount.qNames.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted">Q-Names Total</span>
            <span className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {formatCurrency(qTotal)}
            </span>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
