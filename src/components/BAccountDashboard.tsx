"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { motion } from "framer-motion";
import { Send, Loader2, CheckCircle2, Lock } from "lucide-react";
import DateNavigation from "./DateNavigation";
import SummaryCard from "./SummaryCard";
import GroupAccordion from "./GroupAccordion";
import { getISTDate } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";

interface Group {
  id: string;
  name: string;
  members: { id: string; name: string }[];
}

interface Entry {
  memberId: string;
  amount: number;
  isLocked: boolean;
  pGroupId: string;
}

interface GroupSubmission {
  pGroupId: string;
  status: string;
}

interface DaySubmission {
  status: string;
}

interface EntriesData {
  groups: Group[];
  entries: Entry[];
  groupSubmissions: GroupSubmission[];
  daySubmission: DaySubmission | null;
}

interface VersionStatus {
  version: number;
  status: string;
}

export default function BAccountDashboard({ bAccountId }: { bAccountId: string }) {
  const todayDate = getISTDate();
  const [currentDate, setCurrentDate] = useState(todayDate);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const versionsKey = `/api/entries/versions?date=${currentDate}&bAccountId=${bAccountId}`;
  const { data: versionStatuses = [] } = useSWR<VersionStatus[]>(versionsKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const entriesKey = `/api/entries?date=${currentDate}&version=${currentVersion}`;
  const { data, isLoading, mutate: mutateEntries } = useSWR<EntriesData>(entriesKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const groups = data?.groups || [];
  const entries = data?.entries || [];
  const groupSubmissions = data?.groupSubmissions || [];
  const daySubmission = data?.daySubmission || null;

  const handleAmountChange = async (memberId: string, amount: number, pGroupId: string) => {
    mutateEntries(
      (prev) => {
        if (!prev) return prev;
        const existing = prev.entries.find((e) => e.memberId === memberId);
        const newEntries = existing
          ? prev.entries.map((e) => (e.memberId === memberId ? { ...e, amount } : e))
          : [...prev.entries, { memberId, amount, isLocked: false, pGroupId }];
        return { ...prev, entries: newEntries };
      },
      { revalidate: false }
    );

    await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: currentDate, pGroupId, memberId, amount, version: currentVersion }),
    });
  };

  // Returns true on success, false on failure (for optimistic UI)
  const handleLockEntry = async (memberId: string): Promise<boolean> => {
    const res = await fetch("/api/entries/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: currentDate, memberId, version: currentVersion }),
    });

    if (res.ok) {
      mutateEntries(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            entries: prev.entries.map((e) =>
              e.memberId === memberId ? { ...e, isLocked: true } : e
            ),
          };
        },
        { revalidate: false }
      );
      return true;
    }
    return false;
  };

  const handleUnlockEntry = async (memberId: string): Promise<boolean> => {
    const res = await fetch("/api/entries/b-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: currentDate, memberId, version: currentVersion }),
    });

    if (res.ok) {
      mutateEntries(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            entries: prev.entries.map((e) =>
              e.memberId === memberId ? { ...e, isLocked: false } : e
            ),
            // Revert group submission if it was submitted
            groupSubmissions: prev.groupSubmissions.map((s) => {
              const entry = prev.entries.find((e) => e.memberId === memberId);
              if (entry && s.pGroupId === entry.pGroupId && s.status === "SUBMITTED") {
                return { ...s, status: "PENDING" };
              }
              return s;
            }),
          };
        },
        { revalidate: false }
      );
      return true;
    }
    return false;
  };

  const handleSubmitGroup = async (pGroupId: string) => {
    const res = await fetch("/api/groups/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: currentDate, pGroupId, version: currentVersion }),
    });

    if (res.ok) {
      mutateEntries(
        (prev) => {
          if (!prev) return prev;
          const existing = prev.groupSubmissions.find((s) => s.pGroupId === pGroupId);
          const newSubs = existing
            ? prev.groupSubmissions.map((s) =>
                s.pGroupId === pGroupId ? { ...s, status: "SUBMITTED" } : s
              )
            : [...prev.groupSubmissions, { pGroupId, status: "SUBMITTED" }];
          return { ...prev, groupSubmissions: newSubs };
        },
        { revalidate: false }
      );
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/day/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: currentDate, version: currentVersion }),
      });

      if (res.ok) {
        mutateEntries(
          (prev) => prev ? { ...prev, daySubmission: { status: "FINALIZED" } } : prev,
          { revalidate: false }
        );
        mutate(versionsKey);
        if (currentVersion < 3) {
          setCurrentVersion(currentVersion + 1);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
  const submittedGroupIds = groupSubmissions
    .filter((s) => s.status === "SUBMITTED")
    .map((s) => s.pGroupId);
  const groupsDone = submittedGroupIds.length;
  const allGroupsSubmitted = groups.length > 0 && groupsDone === groups.length;
  const isDayFinalized = daySubmission?.status === "FINALIZED";

  const isVersionEnabled = (v: number) => {
    if (v === 1) return true;
    const prevStatus = versionStatuses.find((vs) => vs.version === v - 1);
    return prevStatus?.status === "FINALIZED";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 shimmer bg-surface rounded-xl" />
        <div className="h-40 shimmer bg-surface rounded-2xl" />
        <div className="h-24 shimmer bg-surface rounded-2xl" />
        <div className="h-24 shimmer bg-surface rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <DateNavigation
          currentDate={currentDate}
          onDateChange={(d) => { setCurrentDate(d); setCurrentVersion(1); }}
          todayDate={todayDate}
        />
      </div>

      {/* Version Tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border">
        {[1, 2, 3].map((v) => {
          const enabled = isVersionEnabled(v);
          const vs = versionStatuses.find((s) => s.version === v);
          const isFinalized = vs?.status === "FINALIZED";
          return (
            <button
              key={v}
              onClick={() => enabled && setCurrentVersion(v)}
              disabled={!enabled}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                currentVersion === v
                  ? "bg-accent text-background"
                  : enabled
                    ? isFinalized
                      ? "text-success hover:bg-success/10"
                      : "text-muted hover:text-foreground"
                    : "text-muted/30 cursor-not-allowed"
              }`}
            >
              {!enabled && <Lock className="w-3 h-3" />}
              {isFinalized && currentVersion !== v && <CheckCircle2 className="w-3 h-3" />}
              V{v}
            </button>
          );
        })}
      </div>

      {/* Summary Card */}
      <SummaryCard
        totalAmount={totalAmount}
        groupsDone={groupsDone}
        groupsTotal={groups.length}
        status={daySubmission?.status as "NOT_STARTED" | "PARTIAL" | "FINALIZED" || "NOT_STARTED"}
      />

      {/* Groups */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Payment Groups — V{currentVersion}
        </h2>

        <motion.div className="space-y-3">
          {groups.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GroupAccordion
                group={group}
                entries={entries.filter((e) => e.pGroupId === group.id)}
                isSubmitted={submittedGroupIds.includes(group.id)}
                isDayFinalized={isDayFinalized}
                onAmountChange={(memberId, amount) =>
                  handleAmountChange(memberId, amount, group.id)
                }
                onLockEntry={handleLockEntry}
                onUnlockEntry={handleUnlockEntry}
                onSubmitGroup={() => handleSubmitGroup(group.id)}
              />
            </motion.div>
          ))}
        </motion.div>

        {groups.length === 0 && (
          <div className="text-center py-12 text-muted">
            <p className="text-sm">No groups assigned to this account</p>
          </div>
        )}
      </div>

      {/* Final Submit */}
      {!isDayFinalized && groups.length > 0 && (
        <motion.div
          className="sticky bottom-4 z-40"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <button
            onClick={handleFinalSubmit}
            disabled={!allGroupsSubmitted || submitting}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
              allGroupsSubmitted
                ? "bg-gradient-to-r from-accent to-amber-500 text-background hover:shadow-accent/25 hover:shadow-xl pulse-glow"
                : "bg-surface text-muted border border-border cursor-not-allowed"
            }`}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Final Submit — V{currentVersion}
              </>
            )}
          </button>
        </motion.div>
      )}

      {isDayFinalized && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-success/10 text-success border border-success/20">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              V{currentVersion} Finalized Successfully
            </span>
          </div>
          {currentVersion < 3 && (
            <p className="text-xs text-muted mt-2">
              V{currentVersion + 1} is now unlocked
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
