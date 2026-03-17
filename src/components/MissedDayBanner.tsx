"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { motion } from "framer-motion";

interface MissedDayBannerProps {
  missedDates: string[];
  onNavigate: (date: string) => void;
}

export default function MissedDayBanner({ missedDates, onNavigate }: MissedDayBannerProps) {
  if (missedDates.length === 0) return null;

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-warning/10 border border-warning/20 rounded-2xl p-4 mb-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-warning">Incomplete Entries</p>
          <p className="text-xs text-muted mt-1">
            You have incomplete entries for the following date(s). Please complete them.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {missedDates.map((date) => (
              <button
                key={date}
                onClick={() => onNavigate(date)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-warning bg-warning/10 hover:bg-warning/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                {formatDate(date)}
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
