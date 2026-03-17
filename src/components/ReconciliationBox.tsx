"use client";

import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

interface ReconciliationBoxProps {
  pGroupTotal: number;
  nNameTotal: number;
  isComplete: boolean;
}

export default function ReconciliationBox({ pGroupTotal, nNameTotal, isComplete }: ReconciliationBoxProps) {
  const difference = pGroupTotal - nNameTotal;
  const isMatch = difference === 0;
  const isPositive = difference > 0;

  return (
    <div className={`glass-card p-5 sm:p-6 border-2 transition-all ${
      !isComplete
        ? "border-border"
        : isMatch
          ? "border-success/30"
          : "border-danger/30"
    }`}>
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
        Reconciliation
      </h3>

      <div className="space-y-3">
        {/* P-Groups Total */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted">P-Groups Total</span>
          <span className="text-sm font-semibold">{formatCurrency(pGroupTotal)}</span>
        </div>

        {/* N-Names Total */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted">N-Names Total</span>
          <span className="text-sm font-semibold">{formatCurrency(nNameTotal)}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Difference */}
        <motion.div
          className={`flex items-center justify-between py-3 px-4 rounded-xl ${
            !isComplete
              ? "bg-muted/5"
              : isMatch
                ? "bg-success/10"
                : "bg-danger/10"
          }`}
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2">
            {!isComplete ? (
              <AlertCircle className="w-4 h-4 text-muted" />
            ) : isMatch ? (
              <Minus className="w-4 h-4 text-success" />
            ) : isPositive ? (
              <TrendingUp className="w-4 h-4 text-danger" />
            ) : (
              <TrendingDown className="w-4 h-4 text-danger" />
            )}
            <span className="text-sm font-medium">Difference</span>
          </div>
          <span className={`text-lg font-bold ${
            !isComplete
              ? "text-muted"
              : isMatch
                ? "text-success"
                : "text-danger"
          }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
            {isMatch ? "₹0" : formatCurrency(Math.abs(difference))}
            {!isMatch && isComplete && (
              <span className="text-xs ml-1 font-normal">
                {isPositive ? "excess" : "deficit"}
              </span>
            )}
          </span>
        </motion.div>

        {!isComplete && (
          <p className="text-xs text-muted text-center mt-2">
            Waiting for all P-groups to be submitted
          </p>
        )}
      </div>
    </div>
  );
}
