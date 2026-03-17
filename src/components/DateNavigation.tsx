"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface DateNavigationProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  todayDate: string;
}

export default function DateNavigation({ currentDate, onDateChange, todayDate }: DateNavigationProps) {
  const isToday = currentDate === todayDate;

  function shiftDate(days: number) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    const newDate = d.toISOString().split("T")[0];
    // Don't go beyond today
    if (newDate > todayDate) return;
    onDateChange(newDate);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => shiftDate(-1)}
        className="p-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border min-w-[180px] justify-center">
        <Calendar className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium">{formatDate(currentDate)}</span>
        {isToday && (
          <span className="text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
            TODAY
          </span>
        )}
      </div>

      <button
        onClick={() => shiftDate(1)}
        disabled={isToday}
        className="p-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {!isToday && (
        <button
          onClick={() => onDateChange(todayDate)}
          className="text-xs text-accent hover:text-accent/80 transition-colors ml-1 font-medium"
        >
          Go to Today
        </button>
      )}
    </div>
  );
}
