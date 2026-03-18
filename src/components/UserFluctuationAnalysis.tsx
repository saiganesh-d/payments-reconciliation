"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { getISTDate, formatCurrency } from "@/lib/utils";

interface BAccountOption {
  id: string;
  name: string;
}

interface DailyAmount {
  date: string;
  amount: number;
}

interface Fluctuator {
  memberId: string;
  memberName: string;
  groupName: string;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  fluctuationPct: number;
  activeDays: number;
  dailyAmounts: DailyAmount[];
}

interface FluctuationData {
  topFluctuators: Fluctuator[];
  activeDates: string[];
  totalMembers: number;
  flaggedCount: number;
}

interface GroupOption {
  id: string;
  name: string;
}

type RangeOption = "7d" | "10d" | "custom";

const LINE_COLORS = [
  "#F0BD60", "#FB7185", "#4ADE80", "#60A5FA", "#C084FC",
  "#F97316", "#2DD4BF", "#E879F9", "#FBBF24", "#A78BFA",
];

function Sparkline({ amounts }: { amounts: number[] }) {
  if (amounts.length < 2) return null;
  const max = Math.max(...amounts);
  const min = Math.min(...amounts);
  const range = max - min || 1;
  const w = 50;
  const h = 20;
  const points = amounts
    .map((a, i) => {
      const x = (i / (amounts.length - 1)) * w;
      const y = h - ((a - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getSeverityColor(pct: number): string {
  if (pct > 100) return "text-danger";
  if (pct >= 50) return "text-warning";
  return "text-success";
}

function getSeverityDot(pct: number): string {
  if (pct > 100) return "bg-danger";
  if (pct >= 50) return "bg-warning";
  return "bg-success";
}

export default function UserFluctuationAnalysis() {
  const todayDate = getISTDate();
  const [bAccountId, setBAccountId] = useState<string>("");
  const [range, setRange] = useState<RangeOption>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [cutoff, setCutoff] = useState(50);
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Fetch B-accounts for dropdown
  const { data: bAccounts = [] } = useSWR<BAccountOption[]>(
    `/api/master/b-accounts?date=${todayDate}`,
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );

  // Compute date range
  const { startDate, endDate } = useMemo(() => {
    if (range === "custom") {
      return { startDate: customStart, endDate: customEnd };
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (range === "10d" ? 10 : 7));
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, [range, customStart, customEnd]);

  const shouldFetch = bAccountId && startDate && endDate;

  const { data, isLoading } = useSWR<FluctuationData>(
    shouldFetch
      ? `/api/master/user-fluctuations?bAccountId=${bAccountId}&startDate=${startDate}&endDate=${endDate}&fluctuationCutoff=${cutoff}&topN=10${groupFilter ? `&pGroupId=${groupFilter}` : ""}`
      : null,
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );

  // Extract group options from b-accounts data
  const { data: detailData } = useSWR<{ bAccount: { pGroups: GroupOption[] } }>(
    bAccountId ? `/api/master/b-account-detail?bAccountId=${bAccountId}&date=${todayDate}` : null,
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );
  const groups: GroupOption[] = detailData?.bAccount?.pGroups || [];

  const toggleUser = (memberId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  // Build chart data
  const chartData = useMemo(() => {
    if (!data) return [];
    const selectedFluctuators = data.topFluctuators.filter((f) =>
      selectedUsers.has(f.memberId)
    );
    if (selectedFluctuators.length === 0) return [];

    return data.activeDates.map((date) => {
      const point: Record<string, string | number> = {
        date,
        label: date.slice(5), // MM-DD
      };
      for (const f of selectedFluctuators) {
        const entry = f.dailyAmounts.find((d) => d.date === date);
        point[f.memberId] = entry?.amount || 0;
      }
      return point;
    });
  }, [data, selectedUsers]);

  const selectedFluctuators = data?.topFluctuators.filter((f) =>
    selectedUsers.has(f.memberId)
  ) || [];

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 items-end">
        {/* B-Account dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted uppercase tracking-wider">B-Account</label>
          <select
            value={bAccountId}
            onChange={(e) => {
              setBAccountId(e.target.value);
              setGroupFilter("");
              setSelectedUsers(new Set());
            }}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs min-w-[120px]"
          >
            <option value="">Select...</option>
            {bAccounts.map((ba) => (
              <option key={ba.id} value={ba.id}>
                {ba.name}
              </option>
            ))}
          </select>
        </div>

        {/* Range buttons */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted uppercase tracking-wider">Range</label>
          <div className="flex gap-1">
            {(["7d", "10d", "custom"] as RangeOption[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  range === r
                    ? "bg-accent text-background"
                    : "bg-surface text-muted border border-border"
                }`}
              >
                {r === "custom" ? "Custom" : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date inputs */}
        {range === "custom" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted uppercase tracking-wider">From</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-surface border border-border rounded-lg px-2 py-1 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted uppercase tracking-wider">To</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-surface border border-border rounded-lg px-2 py-1 text-xs"
              />
            </div>
          </>
        )}

        {/* Cutoff input */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted uppercase tracking-wider">Cutoff</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={cutoff}
              onChange={(e) => setCutoff(parseInt(e.target.value) || 0)}
              className="bg-surface border border-border rounded-lg px-2 py-1 text-xs w-16 text-center"
              min={0}
            />
            <span className="text-xs text-muted">%</span>
          </div>
        </div>

        {/* Group filter */}
        {bAccountId && groups.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted uppercase tracking-wider">Group</label>
            <select
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setSelectedUsers(new Set());
              }}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs min-w-[120px]"
            >
              <option value="">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content area */}
      {!bAccountId ? (
        <div className="text-center py-8 text-muted">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Select a B-Account to analyze user fluctuations</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <div className="h-10 shimmer bg-surface rounded-xl" />
          <div className="h-[200px] shimmer bg-surface rounded-xl" />
          <div className="h-[280px] shimmer bg-surface rounded-xl" />
        </div>
      ) : data ? (
        <>
          {/* Fluctuation Alert Box */}
          {data.topFluctuators.length > 0 ? (
            <div className="bg-surface/50 rounded-xl border border-border">
              <div className="p-3 border-b border-border/50">
                <h3 className="text-sm font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Flagged Users{" "}
                  <span className="text-danger">
                    ({data.flaggedCount} of {data.totalMembers})
                  </span>
                </h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto divide-y divide-border/30">
                {data.topFluctuators.map((f, i) => {
                  const isSelected = selectedUsers.has(f.memberId);
                  const isFlagged = f.fluctuationPct >= cutoff;

                  return (
                    <button
                      key={f.memberId}
                      onClick={() => toggleUser(f.memberId)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors min-h-[44px] ${
                        isSelected
                          ? "bg-accent/5 hover:bg-accent/10"
                          : "hover:bg-surface-hover/50"
                      }`}
                    >
                      {/* Severity dot */}
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isFlagged ? getSeverityDot(f.fluctuationPct) : "bg-success"
                        }`}
                      />

                      {/* Name + group */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold truncate">
                            {f.memberName}
                          </span>
                          <span className="text-[10px] text-muted px-1.5 py-0.5 bg-surface rounded">
                            {f.groupName}
                          </span>
                        </div>
                        {/* Mobile: show stats below name */}
                        <div className="flex items-center gap-2 mt-0.5 sm:hidden">
                          <span className="text-[10px] text-muted">
                            Avg {formatCurrency(f.avgAmount)}
                          </span>
                          <span className="text-[10px] text-muted">
                            {formatCurrency(f.minAmount)}-{formatCurrency(f.maxAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Desktop stats */}
                      <span className="text-xs text-muted hidden sm:block whitespace-nowrap">
                        Avg {formatCurrency(f.avgAmount)}
                      </span>
                      <span className="text-xs text-muted hidden sm:block whitespace-nowrap">
                        {formatCurrency(f.minAmount)} - {formatCurrency(f.maxAmount)}
                      </span>

                      {/* Fluctuation % */}
                      <span
                        className={`text-xs font-bold shrink-0 ${
                          isFlagged ? getSeverityColor(f.fluctuationPct) : "text-success"
                        }`}
                      >
                        {f.fluctuationPct}%
                      </span>

                      {/* Sparkline */}
                      <Sparkline amounts={f.dailyAmounts.map((d) => d.amount)} />

                      {/* Selected indicator */}
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-success/5 rounded-xl border border-success/20">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success" />
              <p className="text-sm text-success font-medium">
                No users exceed the {cutoff}% fluctuation threshold
              </p>
            </div>
          )}

          {/* Multi-User Line Chart */}
          {selectedFluctuators.length > 0 && chartData.length > 0 && (
            <div className="bg-surface/50 rounded-xl border border-border p-4">
              <h3
                className="text-sm font-semibold mb-3"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Daily Amounts Comparison
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-surface)",
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "var(--color-muted)", marginBottom: "4px" }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((value: any, name: any) => {
                      const num = typeof value === "number" ? value : 0;
                      const f = selectedFluctuators.find((fl) => fl.memberId === String(name || ""));
                      return [formatCurrency(num), f?.memberName || String(name || "")];
                    }) as any}
                  />
                  {selectedFluctuators.map((f, i) => (
                    <Line
                      key={f.memberId}
                      type="monotone"
                      dataKey={f.memberId}
                      name={f.memberId}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3 px-1">
                {selectedFluctuators.map((f, i) => (
                  <div key={f.memberId} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
                    />
                    <span className="text-xs text-muted">{f.memberName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
