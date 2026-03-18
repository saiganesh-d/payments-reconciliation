"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, Clock, AlertTriangle, ArrowRight, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import DateNavigation from "./DateNavigation";
import MissedDayBanner from "./MissedDayBanner";
import DifferenceChart from "./DifferenceChart";
import { getISTDate, formatCurrency } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";

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
}

export default function MasterDashboard() {
  const todayDate = getISTDate();
  const [currentDate, setCurrentDate] = useState(todayDate);
  const [showChart, setShowChart] = useState(false);
  const router = useRouter();

  const { data: bAccounts = [], isLoading } = useSWR<BAccountSummary[]>(
    `/api/master/b-accounts?date=${currentDate}`,
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 5000 }
  );

  const { data: missedDays = [] } = useSWR<{ bAccountId: string; bAccountName: string; date: string }[]>(
    "/api/master/missed-days",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const totalPAmount = bAccounts.reduce((sum, ba) => sum + ba.pTotal, 0);
  const totalNAmount = bAccounts.reduce((sum, ba) => sum + ba.nTotal, 0);
  const totalQAmount = bAccounts.reduce((sum, ba) => sum + ba.qTotal, 0);
  const totalDifference = (totalPAmount + totalQAmount) - totalNAmount;
  const uniqueMissedDates = [...new Set(missedDays.map((d) => d.date))];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 shimmer bg-surface rounded-xl" />
        <div className="h-32 shimmer bg-surface rounded-2xl" />
        <div className="h-40 shimmer bg-surface rounded-2xl" />
        <div className="h-40 shimmer bg-surface rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Date Navigation */}
      <DateNavigation
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        todayDate={todayDate}
      />

      {/* Missed Days */}
      {currentDate === todayDate && (
        <MissedDayBanner
          missedDates={uniqueMissedDates}
          onNavigate={setCurrentDate}
        />
      )}

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
              {totalDifference === 0 ? "₹0" : formatCurrency(Math.abs(totalDifference))}
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

      {/* B-Account Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Accounts
        </h2>

        {bAccounts.map((ba, i) => {
          const isMatch = ba.difference === 0 && (ba.pTotal > 0 || ba.qTotal > 0);
          const statusColor =
            ba.status === "FINALIZED" ? "text-success" : ba.status === "PARTIAL" ? "text-warning" : "text-muted";
          const StatusIcon =
            ba.status === "FINALIZED" ? CheckCircle2 : ba.status === "PARTIAL" ? Clock : AlertTriangle;

          return (
            <motion.button
              key={ba.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(`/master/b/${ba.id}?date=${currentDate}`)}
              className="w-full glass-card p-5 text-left hover:border-accent/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {ba.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusIcon className={`w-3.5 h-3.5 ${statusColor}`} />
                      <span className={`text-xs ${statusColor}`}>
                        {ba.submittedGroups}/{ba.pGroupCount} groups
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
              </div>

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
                  isMatch ? "bg-success/10" : ba.pTotal === 0 && ba.nTotal === 0 && ba.qTotal === 0 ? "bg-background/50" : "bg-danger/10"
                }`}>
                  <p className="text-[10px] text-muted uppercase">Diff</p>
                  <p className={`text-sm font-bold mt-0.5 ${
                    isMatch ? "text-success" : ba.pTotal === 0 && ba.nTotal === 0 && ba.qTotal === 0 ? "text-muted" : "text-danger"
                  }`}>
                    {ba.difference === 0 ? "₹0" : formatCurrency(Math.abs(ba.difference))}
                  </p>
                </div>
              </div>
            </motion.button>
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
