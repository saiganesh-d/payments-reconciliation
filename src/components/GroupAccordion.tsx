"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import LockToggle from "./LockToggle";

interface Member {
  id: string;
  name: string;
  note?: string | null;
}

interface Entry {
  memberId: string;
  amount: number;
  isLocked: boolean;
}

interface GroupAccordionProps {
  group: {
    id: string;
    name: string;
    members: Member[];
  };
  entries: Entry[];
  isSubmitted: boolean;
  isDayFinalized: boolean;
  onAmountChange: (memberId: string, amount: number) => void;
  onLockEntry: (memberId: string) => Promise<boolean>;
  onUnlockEntry: (memberId: string) => Promise<boolean>;
  onSubmitGroup: () => void;
}

// Focus the next entry input in the DOM
function focusNextEntry(currentMemberId: string) {
  const allInputs = Array.from(
    document.querySelectorAll<HTMLInputElement>("[data-entry-input]")
  );
  const currentIdx = allInputs.findIndex(
    (el) => el.dataset.entryInput === currentMemberId
  );
  if (currentIdx >= 0 && currentIdx < allInputs.length - 1) {
    const nextInput = allInputs[currentIdx + 1];
    nextInput.focus();
    nextInput.select();
  }
}

export default function GroupAccordion({
  group,
  entries,
  isSubmitted,
  isDayFinalized,
  onAmountChange,
  onLockEntry,
  onUnlockEntry,
  onSubmitGroup,
}: GroupAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [optimisticLocks, setOptimisticLocks] = useState<Record<string, boolean>>({});

  const getEntry = (memberId: string) =>
    entries.find((e) => e.memberId === memberId);

  const isEntryLocked = (memberId: string) => {
    if (memberId in optimisticLocks) return optimisticLocks[memberId];
    return getEntry(memberId)?.isLocked || false;
  };

  const allLocked = group.members.every((m) => isEntryLocked(m.id));

  // Only count active members' entries for total
  const activeMemberIds = new Set(group.members.map((m) => m.id));
  const totalAmount = entries
    .filter((e) => activeMemberIds.has(e.memberId))
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const lockedCount = group.members.filter((m) => isEntryLocked(m.id)).length;
  const totalMembers = group.members.length;

  const handleToggleLock = async (memberId: string, currentlyLocked: boolean, amount: number) => {
    // Allow 0 — only block if no entry exists yet
    if (!currentlyLocked && getEntry(memberId) === undefined) return;

    const newState = !currentlyLocked;
    setOptimisticLocks((prev) => ({ ...prev, [memberId]: newState }));

    if (newState) {
      focusNextEntry(memberId);
    }

    try {
      const success = newState
        ? await onLockEntry(memberId)
        : await onUnlockEntry(memberId);

      if (!success) {
        setOptimisticLocks((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
      } else {
        setOptimisticLocks((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
      }
    } catch {
      setOptimisticLocks((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
    }
  };

  return (
    <div className={`rounded-2xl border transition-all duration-300 ${
      isSubmitted
        ? "border-success/20 bg-success/5"
        : isOpen
          ? "border-accent/30 bg-surface"
          : "border-border bg-surface/50 hover:bg-surface"
    }`}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-5 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
            isSubmitted
              ? "bg-success/10 text-success"
              : "bg-accent/10 text-accent"
          }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
            {group.name}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{group.name} Group</span>
              {isSubmitted && (
                <span className="text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">
                  SUBMITTED
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-muted flex items-center gap-1">
                <Users className="w-3 h-3" />
                {lockedCount}/{totalMembers} locked
              </span>
              <span className="text-xs text-muted">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 space-y-2">
              {/* Member entries */}
              {group.members.map((member) => {
                const entry = getEntry(member.id);
                const isLocked = isEntryLocked(member.id);
                const amount = entry?.amount ?? 0;
                const isReadOnly = isLocked || isDayFinalized;

                return (
                  <div
                    key={member.id}
                    className={`rounded-xl transition-all ${
                      isLocked
                        ? "bg-background/50 border border-success/20"
                        : "bg-background border border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 p-3 sm:p-4">
                      {/* Name + Note (shown below name) */}
                      <div className="flex flex-col min-w-0 w-[110px] sm:w-[150px] shrink-0">
                        <span className={`text-sm font-medium truncate ${isLocked ? "text-muted" : ""}`}>
                          {member.name}
                        </span>
                        {member.note && (
                          <span className="text-[10px] text-muted/70 truncate leading-tight mt-0.5">
                            {member.note}
                          </span>
                        )}
                      </div>

                      {/* Amount Input */}
                      <div className="flex-1 flex items-center justify-center">
                        <div className="relative w-full max-w-[180px]">
                          <input
                            type="number"
                            data-entry-input={member.id}
                            value={entry === undefined ? "" : amount}
                            onChange={(e) => {
                              const raw = e.target.value;
                              onAmountChange(member.id, raw === "" ? 0 : parseInt(raw) || 0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && entry !== undefined && !isLocked && !isDayFinalized) {
                                e.preventDefault();
                                handleToggleLock(member.id, false, amount);
                              }
                            }}
                            disabled={isReadOnly}
                            placeholder="0"
                            className={`w-full px-4 py-2.5 rounded-xl text-center text-base font-bold transition-all ${
                              isLocked
                                ? "bg-success/5 text-success border border-success/20 cursor-not-allowed"
                                : entry !== undefined
                                  ? "bg-accent/5 text-accent border border-accent/30 focus:border-accent/60 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                                  : "bg-surface border border-border text-foreground focus:border-accent/50 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                            }`}
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                      </div>

                      {/* Lock Toggle */}
                      {!isDayFinalized ? (
                        <LockToggle
                          isLocked={isLocked}
                          disabled={!isLocked && entry === undefined}
                          onToggle={() => handleToggleLock(member.id, isLocked, amount)}
                        />
                      ) : (
                        <div className="p-3 text-success shrink-0">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Submit Group Button */}
              {!isSubmitted && !isDayFinalized && (
                <button
                  onClick={onSubmitGroup}
                  disabled={!allLocked}
                  className={`w-full mt-3 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    allLocked
                      ? "bg-accent text-background hover:bg-accent/90"
                      : "bg-surface text-muted border border-border cursor-not-allowed"
                  }`}
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  <Check className="w-4 h-4" />
                  Submit {group.name}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
