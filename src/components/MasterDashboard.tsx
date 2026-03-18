"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, Clock, AlertTriangle, ArrowRight, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import DateNavigation from "./DateNavigation";
import DifferenceChart from "./DifferenceChart";
import UserFluctuationAnalysis from "./UserFluctuationAnalysis";
import { getISTDate, formatCurrency } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";

interface VersionBreakdown {
  version: number;
  pTotal: number;
  nTotal: number;
  qTotal: number;
  difference: number;
  status: string;
  submittedGroups: number;
}

interface BAccountSummary {
  id: string;
  name: string;
  pGroupCount: number;
  submittedGroups: number;
  status: string;
  pTotal: number;
  nTotal: number;
  qTotal: number;
  difference: number;
  nNameCount: number;
  qNameCount: number;
  versions: VersionBreakdown[];
}

export default function MasterDashboard() {
  const todayDate = getISTDate();
  const [currentDate, setCurrentDate] = useState(todayDate);
  const [showChart, setShowChart] = useState(false);
  const [showFluctuation, setShowFluctuation] = useState(false);
  const [expandedBA, setExpandedBA] = useState<string | null>(null);
  const router = useRouter();

  const { data: bAccounts = [], isLoading } = useSWR<BAccountSummary[]>(
    `/api/master/b-accounts?date=${currentDate}`,
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 5000 }
  );

  const totalPAmount = bAccounts.reduce((sum, ba) => sum + ba.pTotal, 0);
  const totalNAmount = bAccounts.reduce((sum, ba) => sum + ba.nTotal, 0);
  const totalQAmount = bAccounts.reduce((sum, ba) => sum + ba.qTotal, 0);
  const totalDifference = (totalPAmount + totalQAmount) - totalNAmount;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 shimmer bg-surface rounded-xl" />
        <div className="h-32 shimmer bg-surface rounded-2xl" />
        <div className="h-40 shimmer bg-surface rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DateNavigation
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        todayDate={todayDate}
      />

      {/* Overall Summary */}
      <div className="glass-card p-5 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">P-Total</p>
            <p className="text-xl sm:text-2xl font-bold mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {formatCurrency(totalPAmount)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">Q-Total</p>
            <p className="text-xl sm:text-2xl font-bold mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {formatCurrency(totalQAmount)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">N-Total</p>
            <p className="text-xl sm:text-2xl font-bold mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {formatCurrency(totalNAmount)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">Difference</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${
              totalDifference === 0 ? "text-success" : "text-danger"
            }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
              {totalDifference === 0 ? "0" : formatCurrency(Math.abs(totalDifference))}
            </p>
            <p className="text-[10px] text-muted">(P + Q) - N</p>
          </div>
        </div>
      </div>

      {/* Difference Chart — collapsible */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setShowChart(!showChart)}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-hover/50 transition-colors"
        >
          <span className="text-sm font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Daily Difference Chart
          </span>
          <motion.div animate={{ rotate: showChart ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-muted" />
          </motion.div>
        </button>
        {showChart && (
          <div className="px-4 pb-4">
            <DifferenceChart />
          </div>
        )}
      </div>

      {/* User Fluctuation Analysis — collapsible */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setShowFluctuation(!showFluctuation)}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-hover/50 transition-colors"
        >
          <span className="text-sm font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            User Fluctuation Analysis
          </span>
          <motion.div animate={{ rotate: showFluctuation ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-muted" />
          </motion.div>
        </button>
        {showFluctuation && (
          <div className="px-4 pb-4">
            <UserFluctuationAnalysis />
          </div>
        )}
      </div>

      {/* B-Account Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Accounts
        </h2>

        {bAccounts.map((ba, i) => {
          const isMatch = ba.difference === 0 && (ba.pTotal > 0 || ba.qTotal > 0);
          const hasDifference = ba.difference !== 0 && (ba.pTotal > 0 || ba.nTotal > 0 || ba.qTotal > 0);
          const isExpanded = expandedBA === ba.id;
          const activeVersions = ba.versions.filter((v) => v.status !== "NOT_STARTED");

          return (
            <motion.div
              key={ba.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card overflow-hidden transition-all ${
                hasDifference ? "border-danger/30" : ""
              }`}
            >
              {/* Main card — click to detail */}
              <button
                onClick={() => router.push(`/master/b/${ba.id}?date=${currentDate}`)}
                className="w-full p-5 text-left hover:bg-surface-hover/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                      hasDifference
                        ? "bg-danger/10 border-danger/20"
                        : "bg-accent/10 border-accent/20"
                    }`}>
                      <Building2 className={`w-5 h-5 ${hasDifference ? "text-danger" : "text-accent"}`} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {ba.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {ba.status === "FINALIZED" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        ) : ba.status === "PARTIAL" ? (
                          <Clock className="w-3.5 h-3.5 text-warning" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-muted" />
                        )}
                        <span className="text-xs text-muted">
                          {ba.submittedGroups}/{ba.pGroupCount} groups
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
                </div>

                {/* Overall totals */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-background/50 rounded-xl p-3">
                    <p className="text-[10px] text-muted uppercase">P</p>
                    <p className="text-sm font-bold mt-0.5">{formatCurrency(ba.pTotal)}</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-3">
                    <p className="text-[10px] text-muted uppercase">Q</p>
                    <p className="text-sm font-bold mt-0.5">{formatCurrency(ba.qTotal)}</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-3">
                    <p className="text-[10px] text-muted uppercase">N</p>
                    <p className="text-sm font-bold mt-0.5">{formatCurrency(ba.nTotal)}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${
                    isMatch ? "bg-success/10" : !hasDifference ? "bg-background/50" : "bg-danger/10"
                  }`}>
                    <p className="text-[10px] text-muted uppercase">Diff</p>
                    <p className={`text-sm font-bold mt-0.5 ${
                      isMatch ? "text-success" : !hasDifference ? "text-muted" : "text-danger"
                    }`}>
                      {ba.difference === 0 ? "0" : formatCurrency(Math.abs(ba.difference))}
                    </p>
                  </div>
                </div>
              </button>

              {/* Version expand toggle */}
              {activeVersions.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedBA(isExpanded ? null : ba.id); }}
                  className="w-full flex items-center justify-center gap-1 py-2 border-t border-border/50 text-xs text-muted hover:text-foreground hover:bg-surface-hover/30 transition-colors"
                >
                  <span>{activeVersions.length} version{activeVersions.length > 1 ? "s" : ""}</span>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-3 h-3" />
                  </motion.div>
                </button>
              )}

              {/* Version breakdown */}
              {isExpanded && (
                <div className="border-t border-border/50 px-5 py-3 space-y-2">
                  {ba.versions.map((v) => {
                    if (v.status === "NOT_STARTED" && v.pTotal === 0 && v.nTotal === 0 && v.qTotal === 0) return null;
                    const vMatch = v.difference === 0 && (v.pTotal > 0 || v.qTotal > 0);
                    const vHasDiff = v.difference !== 0 && (v.pTotal > 0 || v.nTotal > 0 || v.qTotal > 0);
                    const StatusIcon = v.status === "FINALIZED" ? CheckCircle2 : v.status === "PARTIAL" ? Clock : AlertTriangle;
                    const statusColor = v.status === "FINALIZED" ? "text-success" : v.status === "PARTIAL" ? "text-warning" : "text-muted";

                    return (
                      <button
                        key={v.version}
                        onClick={() => router.push(`/master/b/${ba.id}?date=${currentDate}&version=${v.version}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-background hover:bg-surface-hover/50 transition-colors text-left"
                      >
                        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          v.status === "FINALIZED" ? "bg-success/10 text-success" : "bg-surface text-muted"
                        }`}>
                          V{v.version}
                        </div>
                        <div className="flex-1 grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-muted">P:</span>{" "}
                            <span className="font-semibold">{formatCurrency(v.pTotal)}</span>
                          </div>
                          <div>
                            <span className="text-muted">Q:</span>{" "}
                            <span className="font-semibold">{formatCurrency(v.qTotal)}</span>
                          </div>
                          <div>
                            <span className="text-muted">N:</span>{" "}
                            <span className="font-semibold">{formatCurrency(v.nTotal)}</span>
                          </div>
                          <div className={vMatch ? "text-success" : vHasDiff ? "text-danger" : "text-muted"}>
                            <span className="font-bold">{v.difference === 0 ? "0" : formatCurrency(Math.abs(v.difference))}</span>
                          </div>
                        </div>
                        <StatusIcon className={`w-3.5 h-3.5 ${statusColor} shrink-0`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}

        {bAccounts.length === 0 && (
          <div className="text-center py-12 text-muted">
            <p className="text-sm">No accounts configured yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
