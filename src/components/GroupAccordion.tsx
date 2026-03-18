"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Lock, Unlock, Users, IndianRupee, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  onLockEntry: (memberId: string) => void;
  onUnlockEntry: (memberId: string) => void;
  onSubmitGroup: () => void;
}

function NoteTooltip({ note }: { note: string }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="p-0.5 text-muted/60 hover:text-accent transition-colors"
        type="button"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 px-3 py-2 rounded-lg bg-surface border border-border shadow-2xl text-xs text-foreground max-w-[220px] text-center animate-in fade-in duration-100"
          style={{ whiteSpace: "normal", wordBreak: "break-word" }}
        >
          {note}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[5px] border-b-border" />
        </div>
      )}
    </span>
  );
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

  const getEntry = (memberId: string) =>
    entries.find((e) => e.memberId === memberId);

  const allLocked = group.members.every((m) => {
    const entry = getEntry(m.id);
    return entry?.isLocked;
  });

  const totalAmount = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
  const lockedCount = entries.filter((e) => e.isLocked).length;
  const totalMembers = group.members.length;

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
              <span className="text-xs text-muted flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
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
                const isLocked = entry?.isLocked || false;
                const amount = entry?.amount || 0;
                const isReadOnly = (isLocked || isSubmitted || isDayFinalized);

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
                      {/* Name + Note */}
                      <div className="min-w-0 flex items-center gap-1.5 w-[120px] sm:w-[160px] shrink-0">
                        <span className={`text-sm font-medium truncate ${isLocked ? "text-muted" : ""}`}>
                          {member.name}
                        </span>
                        {member.note && <NoteTooltip note={member.note} />}
                      </div>

                      {/* Amount Input — prominent */}
                      <div className="flex-1 flex items-center justify-center">
                        <div className={`relative w-full max-w-[200px] ${isLocked ? "" : ""}`}>
                          <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isLocked ? "text-success/60" : "text-muted"}`}>₹</span>
                          <input
                            type="number"
                            value={amount || ""}
                            onChange={(e) => onAmountChange(member.id, parseInt(e.target.value) || 0)}
                            disabled={isReadOnly}
                            placeholder="0"
                            className={`w-full pl-8 pr-4 py-2.5 rounded-xl text-center text-base font-bold transition-all ${
                              isLocked
                                ? "bg-success/5 text-success border border-success/20 cursor-not-allowed"
                                : amount
                                  ? "bg-accent/5 text-accent border border-accent/30 focus:border-accent/60 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                                  : "bg-surface border border-border text-foreground focus:border-accent/50 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                            }`}
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                      </div>

                      {/* Lock / Unlock Toggle */}
                      {!isSubmitted && !isDayFinalized && (
                        <button
                          onClick={() => isLocked ? onUnlockEntry(member.id) : onLockEntry(member.id)}
                          disabled={!isLocked && !amount}
                          className={`p-3 rounded-xl transition-all shrink-0 ${
                            isLocked
                              ? "bg-success/10 text-success hover:bg-warning/10 hover:text-warning"
                              : amount
                                ? "bg-accent/10 text-accent hover:bg-accent/20"
                                : "bg-surface text-muted/30 cursor-not-allowed"
                          }`}
                          title={isLocked ? "Click to unlock" : amount ? "Click to lock" : "Enter amount first"}
                        >
                          {isLocked ? (
                            <Lock className="w-5 h-5" />
                          ) : (
                            <Unlock className="w-5 h-5" />
                          )}
                        </button>
                      )}

                      {/* Submitted check */}
                      {(isSubmitted || isDayFinalized) && (
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
