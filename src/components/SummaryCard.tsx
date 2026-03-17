"use client";

import { IndianRupee, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";

interface SummaryCardProps {
  totalAmount: number;
  groupsDone: number;
  groupsTotal: number;
  status: "NOT_STARTED" | "PARTIAL" | "FINALIZED";
}

export default function SummaryCard({ totalAmount, groupsDone, groupsTotal, status }: SummaryCardProps) {
  const progress = groupsTotal > 0 ? (groupsDone / groupsTotal) * 100 : 0;

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-wider">Today&apos;s Total</p>
          <p className="text-3xl sm:text-4xl font-bold mt-1 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${
          status === "FINALIZED" ? "bg-success/10" : status === "PARTIAL" ? "bg-warning/10" : "bg-muted/10"
        }`}>
          {status === "FINALIZED" ? (
            <CheckCircle2 className="w-5 h-5 text-success" />
          ) : status === "PARTIAL" ? (
            <Clock className="w-5 h-5 text-warning" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-muted" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Groups completed</span>
          <span className="font-medium">
            {groupsDone} / {groupsTotal}
          </span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-4 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${
          status === "FINALIZED"
            ? "bg-success/10 text-success"
            : status === "PARTIAL"
              ? "bg-warning/10 text-warning"
              : "bg-muted/10 text-muted"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === "FINALIZED" ? "bg-success" : status === "PARTIAL" ? "bg-warning" : "bg-muted"
          }`} />
          {status === "FINALIZED" ? "Day Finalized" : status === "PARTIAL" ? "In Progress" : "Not Started"}
        </span>
      </div>
    </div>
  );
}
