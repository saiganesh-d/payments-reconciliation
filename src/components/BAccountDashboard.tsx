"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import DateNavigation from "./DateNavigation";
import SummaryCard from "./SummaryCard";
import GroupAccordion from "./GroupAccordion";
import MissedDayBanner from "./MissedDayBanner";
import { getISTDate } from "@/lib/utils";

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

export default function BAccountDashboard({ bAccountId }: { bAccountId: string }) {
  const todayDate = getISTDate();
  const [currentDate, setCurrentDate] = useState(todayDate);
  const [groups, setGroups] = useState<Group[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [groupSubmissions, setGroupSubmissions] = useState<GroupSubmission[]>([]);
  const [daySubmission, setDaySubmission] = useState<DaySubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [missedDates, setMissedDates] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/entries?date=${currentDate}`);
      const data = await res.json();
      setGroups(data.groups || []);
      setEntries(data.entries || []);
      setGroupSubmissions(data.groupSubmissions || []);
      setDaySubmission(data.daySubmission || null);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const fetchMissedDays = useCallback(async () => {
    try {
      const res = await fetch("/api/master/missed-days");
      const data = await res.json();
      setMissedDates(data.map((d: { date: string }) => d.date));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchMissedDays();
  }, [fetchMissedDays]);

  const handleAmountChange = async (memberId: string, amount: number, pGroupId: string) => {
    // Optimistic update
    setEntries((prev) => {
      const existing = prev.find((e) => e.memberId === memberId);
      if (existing) {
        return prev.map((e) => (e.memberId === memberId ? { ...e, amount } : e));
      }
      return [...prev, { memberId, amount, isLocked: false, pGroupId }];
    });

    // Debounced save
    await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: currentDate, pGroupId, memberId, amount }),
    });
  };

  const handleLockEntry = async (memberId: string) => {
    const res = await fetch("/api/entries/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: currentDate, memberId }),
    });

    if (res.ok) {
      setEntries((prev) =>
        prev.map((e) => (e.memberId === memberId ? { ...e, isLocked: true } : e))
      );
    }
  };

  const handleSubmitGroup = async (pGroupId: string) => {
    const res = await fetch("/api/groups/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: currentDate, pGroupId }),
    });

    if (res.ok) {
      setGroupSubmissions((prev) => {
        const existing = prev.find((s) => s.pGroupId === pGroupId);
        if (existing) {
          return prev.map((s) => (s.pGroupId === pGroupId ? { ...s, status: "SUBMITTED" } : s));
        }
        return [...prev, { pGroupId, status: "SUBMITTED" }];
      });
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/day/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: currentDate }),
      });

      if (res.ok) {
        setDaySubmission({ status: "FINALIZED" });
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
  const isReadOnly = currentDate !== todayDate && isDayFinalized;

  if (loading) {
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
          onDateChange={setCurrentDate}
          todayDate={todayDate}
        />
      </div>

      {/* Missed Days Banner */}
      <MissedDayBanner
        missedDates={missedDates}
        onNavigate={setCurrentDate}
      />

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
          Payment Groups
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
            ) : isDayFinalized ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Day Finalized
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Final Submit — All Groups
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
              Day Finalized Successfully
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
