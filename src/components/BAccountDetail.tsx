"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, Lock, Unlock, ChevronDown, StickyNote } from "lucide-react";
import LockToggle from "./LockToggle";
import { useRouter } from "next/navigation";
import DateNavigation from "./DateNavigation";
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

interface NName { id: string; name: string }
interface QName { id: string; name: string }

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
  version: number;
}

interface QEntry {
  id?: string;
  qNameId: string;
  isLocked?: boolean;
  amount: number;
  version: number;
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
  initialVersion,
}: {
  bAccountId: string;
  initialDate?: string;
  initialVersion?: number;
}) {
  const todayDate = getISTDate();
  const [currentDate, setCurrentDate] = useState(initialDate || todayDate);
  const [nAmounts, setNAmounts] = useState<Record<string, number>>({});
  const [qAmounts, setQAmounts] = useState<Record<string, number>>({});
  const [lockingN, setLockingN] = useState<string | null>(null);
  const [lockingQ, setLockingQ] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [optimisticNLocks, setOptimisticNLocks] = useState<Record<string, boolean>>({});
  const [optimisticQLocks, setOptimisticQLocks] = useState<Record<string, boolean>>({});
  const [selectedVersion, setSelectedVersion] = useState(initialVersion || 1);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const router = useRouter();

  const detailKey = `/api/master/b-account-detail?bAccountId=${bAccountId}&date=${currentDate}`;
  const { data, isLoading, mutate: mutateDetail } = useSWR<DetailData>(detailKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
    refreshInterval: 10000,
  });

  // Version notes
  const noteKey = `/api/master/version-notes?bAccountId=${bAccountId}&date=${currentDate}&version=${selectedVersion}`;
  const { data: noteData } = useSWR<{ note: string }>(noteKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  useEffect(() => {
    setNoteText(noteData?.note || "");
  }, [noteData?.note]);

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await fetch("/api/master/version-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bAccountId, date: currentDate, version: selectedVersion, note: noteText }),
      });
    } finally {
      setSavingNote(false);
    }
  };

  const bAccount = data?.bAccount || null;
  const entries = data?.entries || [];
  const nEntries = data?.nEntries || [];
  const qEntries = data?.qEntries || [];
  const groupSubmissions = data?.groupSubmissions || [];
  const daySubmissions = data?.daySubmissions || [];

  // Sync nAmounts when data or version changes
  useEffect(() => {
    if (data?.nEntries) {
      const amounts: Record<string, number> = {};
      data.nEntries
        .filter((ne) => ne.version === selectedVersion)
        .forEach((ne) => { amounts[ne.nNameId] = ne.amount; });
      setNAmounts(amounts);
    }
  }, [data?.nEntries, selectedVersion]);

  // Sync qAmounts when data or version changes
  useEffect(() => {
    if (data?.qEntries) {
      const amounts: Record<string, number> = {};
      data.qEntries
        .filter((qe) => qe.version === selectedVersion)
        .forEach((qe) => { amounts[qe.qNameId] = qe.amount; });
      setQAmounts(amounts);
    }
  }, [data?.qEntries, selectedVersion]);

  // Focus next master entry input
  const focusNextMasterEntry = (currentId: string) => {
    const allInputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-master-input]"));
    const idx = allInputs.findIndex((el) => el.dataset.masterInput === currentId);
    if (idx >= 0 && idx < allInputs.length - 1) {
      allInputs[idx + 1].focus();
      allInputs[idx + 1].select();
    }
  };

  // Lock N-entry: optimistic, saves first, then locks
  const handleNLock = async (nNameId: string, action: "lock" | "unlock") => {
    const newState = action === "lock";
    setOptimisticNLocks((prev) => ({ ...prev, [nNameId]: newState }));
    if (newState) focusNextMasterEntry(`n-${nNameId}`);

    try {
      if (action === "lock") {
        setLockingN(nNameId);
        await fetch("/api/master/n-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: currentDate, bAccountId, nNameId, amount: nAmounts[nNameId] || 0, version: selectedVersion }),
        });
        const res = await fetch("/api/master/n-entries/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: currentDate, nNameId, action: "lock", version: selectedVersion }),
        });
        setLockingN(null);
        if (!res.ok) {
          setOptimisticNLocks((prev) => { const n = { ...prev }; delete n[nNameId]; return n; });
          return;
        }
      } else {
        const res = await fetch("/api/master/n-entries/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: currentDate, nNameId, action: "unlock", version: selectedVersion }),
        });
        if (!res.ok) {
          setOptimisticNLocks((prev) => { const n = { ...prev }; delete n[nNameId]; return n; });
          return;
        }
      }
      await mutateDetail();
      setOptimisticNLocks((prev) => { const n = { ...prev }; delete n[nNameId]; return n; });
    } catch {
      setOptimisticNLocks((prev) => { const n = { ...prev }; delete n[nNameId]; return n; });
    }
  };

  // Lock Q-entry: optimistic, saves first, then locks
  const handleQLock = async (qNameId: string, action: "lock" | "unlock") => {
    const newState = action === "lock";
    setOptimisticQLocks((prev) => ({ ...prev, [qNameId]: newState }));
    if (newState) focusNextMasterEntry(`q-${qNameId}`);

    try {
      if (action === "lock") {
        setLockingQ(qNameId);
        await fetch("/api/master/q-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: currentDate, bAccountId, qNameId, amount: qAmounts[qNameId] || 0, version: selectedVersion }),
        });
        const res = await fetch("/api/master/q-entries/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: currentDate, qNameId, action: "lock", version: selectedVersion }),
        });
        setLockingQ(null);
        if (!res.ok) {
          setOptimisticQLocks((prev) => { const n = { ...prev }; delete n[qNameId]; return n; });
          return;
        }
      } else {
        const res = await fetch("/api/master/q-entries/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: currentDate, qNameId, action: "unlock", version: selectedVersion }),
        });
        if (!res.ok) {
          setOptimisticQLocks((prev) => { const n = { ...prev }; delete n[qNameId]; return n; });
          return;
        }
      }
      await mutateDetail();
      setOptimisticQLocks((prev) => { const n = { ...prev }; delete n[qNameId]; return n; });
    } catch {
      setOptimisticQLocks((prev) => { const n = { ...prev }; delete n[qNameId]; return n; });
    }
  };

  const handleUnlock = async (entryId: string) => {
    if (!confirm("Unlock this entry? The B-account user will need to re-lock it.")) return;
    const res = await fetch("/api/entries/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId }),
    });
    if (res.ok) mutateDetail();
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

  // Filtered by selected version
  const versionEntries = entries.filter((e) => e.version === selectedVersion);
  const versionNEntries = nEntries.filter((e) => e.version === selectedVersion);
  const versionQEntries = qEntries.filter((e) => e.version === selectedVersion);
  const versionGroupSubs = groupSubmissions.filter((s) => s.version === selectedVersion);

  const submittedGroupIds = versionGroupSubs
    .filter((s) => s.status === "SUBMITTED")
    .map((s) => s.pGroupId);

  // Only count active members' entries for totals
  const activePMemberIds = new Set(
    bAccount.pGroups.flatMap((g) => g.members.map((m) => m.id))
  );
  const vPTotal = versionEntries
    .filter((e) => activePMemberIds.has(e.memberId))
    .reduce((sum, e) => sum + e.amount, 0);
  const vNTotal = versionNEntries.reduce((sum, e) => sum + e.amount, 0);
  const vQTotal = versionQEntries.reduce((sum, e) => sum + e.amount, 0);
  const vDifference = (vPTotal + vQTotal) - vNTotal;
  const vIsMatch = vDifference === 0 && (vPTotal > 0 || vQTotal > 0);
  const vHasDiff = vDifference !== 0 && (vPTotal > 0 || vNTotal > 0 || vQTotal > 0);

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

      <DateNavigation
        currentDate={currentDate}
        onDateChange={(d) => { setCurrentDate(d); setSelectedVersion(1); }}
        todayDate={todayDate}
      />

      {/* Version Tabs — top level */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border">
        {[1, 2, 3].map((v) => {
          const status = getVersionStatus(v);
          const isFinalized = status === "FINALIZED";
          return (
            <button
              key={v}
              onClick={() => setSelectedVersion(v)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                selectedVersion === v
                  ? "bg-accent text-background"
                  : isFinalized
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-surface text-muted border border-border hover:text-foreground"
              }`}
            >
              {isFinalized && selectedVersion !== v && <CheckCircle2 className="w-3.5 h-3.5" />}
              V{v}
            </button>
          );
        })}
      </div>

      {/* Difference Box — for selected version */}
      <div className={`glass-card p-5 sm:p-6 border-2 transition-all ${
        vIsMatch ? "border-success/30" : vHasDiff ? "border-danger/30" : "border-border"
      }`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">P-Total</p>
            <p className="text-lg font-bold mt-0.5 tabular-nums" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {formatCurrency(vPTotal)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">Q-Total</p>
            <p className="text-lg font-bold mt-0.5 tabular-nums" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {formatCurrency(vQTotal)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">N-Total</p>
            <p className="text-lg font-bold mt-0.5 tabular-nums" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {formatCurrency(vNTotal)}
            </p>
          </div>
          <div className={`rounded-xl p-2 -m-2 ${
            vIsMatch ? "bg-success/10" : vHasDiff ? "bg-danger/10" : ""
          }`}>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">Difference</p>
            <p className={`text-lg font-bold mt-0.5 tabular-nums ${
              vIsMatch ? "text-success" : vHasDiff ? "text-danger" : "text-muted"
            }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
              {vDifference === 0 ? "0" : formatCurrency(Math.abs(vDifference))}
            </p>
            <p className="text-[10px] text-muted">(P + Q) - N</p>
          </div>
        </div>
      </div>

      {/* Version Note */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setShowNote(!showNote)}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-hover/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <StickyNote className={`w-4 h-4 ${showNote ? "text-accent" : "text-muted"}`} />
            <span className="text-sm font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Note — V{selectedVersion}
            </span>
            {noteData?.note && !showNote && (
              <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">has note</span>
            )}
          </div>
          <motion.div animate={{ rotate: showNote ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-muted" />
          </motion.div>
        </button>
        <AnimatePresence>
          {showNote && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note for this version (e.g., why amounts changed)..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm resize-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={saveNote}
                    disabled={savingNote}
                    className="px-4 py-1.5 rounded-lg bg-accent text-background text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    {savingNote ? "Saving..." : "Save Note"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* N-Names */}
      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
            N-Names — V{selectedVersion}
          </h3>
          <span className="text-xs text-muted">
            {versionNEntries.filter((e) => e.isLocked).length}/{bAccount.nNames.length} locked
          </span>
        </div>
        <div className="space-y-2">
          {bAccount.nNames.map((nName) => {
            const currentAmount = nAmounts[nName.id] ?? 0;
            const savedEntry = versionNEntries.find((e) => e.nNameId === nName.id);
            // hasValue: user has typed into this field OR a saved entry exists
            const hasNValue = (nName.id in nAmounts) || savedEntry !== undefined;
            const isLocked = nName.id in optimisticNLocks ? optimisticNLocks[nName.id] : (savedEntry?.isLocked || false);

            return (
              <div key={nName.id} className={`rounded-xl transition-all ${
                isLocked ? "bg-background border border-success/20" : "bg-background border border-border"
              }`}>
                <div className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="w-[80px] sm:w-[140px] shrink-0">
                    <span className={`text-sm font-medium ${isLocked ? "text-muted" : ""}`}>{nName.name}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative w-full max-w-[180px]">
                      <input
                        type="number"
                        data-master-input={`n-${nName.id}`}
                        value={hasNValue ? currentAmount : ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setNAmounts((prev) => ({ ...prev, [nName.id]: raw === "" ? 0 : parseInt(raw) || 0 }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && hasNValue && !isLocked) {
                            e.preventDefault();
                            handleNLock(nName.id, "lock");
                          }
                        }}
                        disabled={isLocked}
                        placeholder="0"
                        className={`w-full px-4 py-2.5 rounded-xl text-center text-base font-bold transition-all ${
                          isLocked
                            ? "bg-success/5 text-success border border-success/20 cursor-not-allowed"
                            : hasNValue
                              ? "bg-accent/5 text-accent border border-accent/30 focus:border-accent/60 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                              : "bg-surface border border-border text-foreground focus:border-accent/50 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                        }`}
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      />
                    </div>
                  </div>
                  <LockToggle
                    isLocked={isLocked}
                    disabled={(!isLocked && !hasNValue) || lockingN === nName.id}
                    onToggle={() => handleNLock(nName.id, isLocked ? "unlock" : "lock")}
                  />
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
            <span className="text-sm text-muted">N-Names Total (V{selectedVersion})</span>
            <span className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {formatCurrency(Object.values(nAmounts).reduce((sum, a) => sum + (a || 0), 0))}
            </span>
          </div>
        )}
      </div>

      {/* Q-Names */}
      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Q-Names — V{selectedVersion}
          </h3>
          <span className="text-xs text-muted">
            {versionQEntries.filter((e) => e.isLocked).length}/{bAccount.qNames.length} locked
          </span>
        </div>
        <div className="space-y-2">
          {bAccount.qNames.map((qName) => {
            const currentAmount = qAmounts[qName.id] ?? 0;
            const savedEntry = versionQEntries.find((e) => e.qNameId === qName.id);
            const hasQValue = (qName.id in qAmounts) || savedEntry !== undefined;
            const isLocked = qName.id in optimisticQLocks ? optimisticQLocks[qName.id] : (savedEntry?.isLocked || false);

            return (
              <div key={qName.id} className={`rounded-xl transition-all ${
                isLocked ? "bg-background border border-success/20" : "bg-background border border-border"
              }`}>
                <div className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="w-[80px] sm:w-[140px] shrink-0">
                    <span className={`text-sm font-medium ${isLocked ? "text-muted" : ""}`}>{qName.name}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative w-full max-w-[180px]">
                      <input
                        type="number"
                        data-master-input={`q-${qName.id}`}
                        value={hasQValue ? currentAmount : ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setQAmounts((prev) => ({ ...prev, [qName.id]: raw === "" ? 0 : parseInt(raw) || 0 }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && hasQValue && !isLocked) {
                            e.preventDefault();
                            handleQLock(qName.id, "lock");
                          }
                        }}
                        disabled={isLocked}
                        placeholder="0"
                        className={`w-full px-4 py-2.5 rounded-xl text-center text-base font-bold transition-all ${
                          isLocked
                            ? "bg-success/5 text-success border border-success/20 cursor-not-allowed"
                            : hasQValue
                              ? "bg-accent/5 text-accent border border-accent/30 focus:border-accent/60 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                              : "bg-surface border border-border text-foreground focus:border-accent/50 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                        }`}
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      />
                    </div>
                  </div>
                  <LockToggle
                    isLocked={isLocked}
                    disabled={(!isLocked && !hasQValue) || lockingQ === qName.id}
                    onToggle={() => handleQLock(qName.id, isLocked ? "unlock" : "lock")}
                  />
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
            <span className="text-sm text-muted">Q-Names Total (V{selectedVersion})</span>
            <span className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {formatCurrency(Object.values(qAmounts).reduce((sum, a) => sum + (a || 0), 0))}
            </span>
          </div>
        )}
      </div>

      {/* P-Groups — collapsible read-only */}
      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
            P-Groups — V{selectedVersion}
          </h3>
          <span className="text-xs text-muted">
            {submittedGroupIds.length}/{bAccount.pGroups.length} submitted
          </span>
        </div>
        <div className="space-y-2">
          {bAccount.pGroups.map((group) => {
            const isSubmitted = submittedGroupIds.includes(group.id);
            const groupEntries = versionEntries.filter((e) => e.pGroupId === group.id);
            const activeGroupMemberIds = new Set(group.members.map((m) => m.id));
            const groupTotal = groupEntries
              .filter((e) => activeGroupMemberIds.has(e.memberId))
              .reduce((sum, e) => sum + e.amount, 0);
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
                      <span className="text-xs text-muted ml-2">{group.members.length} members</span>
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
                      <div className="border-t border-border/50 px-4 py-2 space-y-1 overflow-visible">
                        {group.members.map((member) => {
                          const entry = groupEntries.find((e) => e.memberId === member.id);
                          return (
                            <div key={member.id} className="flex items-center justify-between py-1.5 text-xs">
                              <span className="flex flex-col min-w-0">
                                <span className="truncate">{member.name}</span>
                                {member.note && (
                                  <span className="text-[10px] text-muted/60 truncate leading-tight">
                                    {member.note}
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
    </div>
  );
}
