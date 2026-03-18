"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, Legend,
} from "recharts";
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

type ChartView = "line" | "bar";

// Generate all dates in range (inclusive), filling gaps with zeros
function getAllDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

const COLORS = [
  "#F0BD60", "#FB7185", "#4ADE80", "#60A5FA", "#C084FC",
  "#F97316", "#2DD4BF", "#E879F9", "#FBBF24", "#A78BFA",
  "#34D399", "#F472B6", "#38BDF8", "#A3E635", "#818CF8",
];

export default function UserFluctuationAnalysis() {
  const todayDate = getISTDate();
  const [bAccountId, setBAccountId] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [chartView, setChartView] = useState<ChartView>("line");
  const [focusedLine, setFocusedLine] = useState<string | null>(null);

  // Fetch B-accounts
  const { data: bAccounts = [] } = useSWR<BAccountOption[]>(
    `/api/master/b-accounts?date=${todayDate}`,
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );

  // Auto-select first B-account (B1)
  useEffect(() => {
    if (bAccounts.length > 0 && !bAccountId) {
      setBAccountId(bAccounts[0].id);
    }
  }, [bAccounts, bAccountId]);

  // Date range: last 7 days
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, []);

  // Fetch fluctuation data (all users, topN=50 for broader view)
  const { data, isLoading } = useSWR<FluctuationData>(
    bAccountId
      ? `/api/master/user-fluctuations?bAccountId=${bAccountId}&startDate=${startDate}&endDate=${endDate}&fluctuationCutoff=0&topN=50${groupFilter ? `&pGroupId=${groupFilter}` : ""}`
      : null,
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );

  // Groups for filter
  const { data: detailData } = useSWR<{ bAccount: { pGroups: GroupOption[] } }>(
    bAccountId ? `/api/master/b-account-detail?bAccountId=${bAccountId}&date=${todayDate}` : null,
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );
  const groups: GroupOption[] = detailData?.bAccount?.pGroups || [];

  const allUsers = data?.topFluctuators || [];
  const activeDates = data?.activeDates || [];

  // Full date range (all 7 days, filling missing with zeros)
  const allDates = useMemo(() => getAllDatesInRange(startDate, endDate), [startDate, endDate]);

  // Selected user data
  const selectedUserData = selectedUser
    ? allUsers.find((u) => u.memberId === selectedUser)
    : null;

  // === CHART DATA BUILDERS ===

  // Level 1: All users — line chart (X=dates, each line=user) or heat-style bar
  const allUsersLineData = useMemo(() => {
    if (!allDates.length || !allUsers.length) return [];
    return allDates.map((date) => {
      const point: Record<string, string | number> = { date, label: date.slice(5) };
      for (const u of allUsers) {
        const entry = u.dailyAmounts.find((d) => d.date === date);
        point[u.memberId] = entry?.amount || 0;
      }
      return point;
    });
  }, [allDates, allUsers]);

  // Bar chart: X=user names, grouped bars per date
  const allUsersBarData = useMemo(() => {
    if (!allUsers.length || !allDates.length) return [];
    return allUsers.map((u) => {
      const point: Record<string, string | number> = { name: u.memberName, memberId: u.memberId };
      for (const date of allDates) {
        const entry = u.dailyAmounts.find((d) => d.date === date);
        point[date] = entry?.amount || 0;
      }
      return point;
    });
  }, [allUsers, allDates]);

  // Level 3: Single user bar data — show all dates in range
  const singleUserBarData = useMemo(() => {
    if (!selectedUserData) return [];
    return allDates.map((date) => {
      const entry = selectedUserData.dailyAmounts.find((d) => d.date === date);
      return { date, label: date.slice(5), amount: entry?.amount || 0 };
    });
  }, [selectedUserData, allDates]);

  // Heat map data: users as rows, cells colored by PER-ROW intensity
  const heatMapData = useMemo(() => {
    if (!allUsers.length || !allDates.length) return [];
    return allUsers.map((u) => {
      const amounts = allDates.map((date) => {
        const entry = u.dailyAmounts.find((d) => d.date === date);
        return entry?.amount || 0;
      });
      const rowMax = Math.max(...amounts, 1);
      return {
        ...u,
        cells: allDates.map((date, i) => ({
          date,
          amount: amounts[i],
          intensity: amounts[i] / rowMax,
        })),
      };
    });
  }, [allUsers, allDates]);

  const selectedBName = bAccounts.find((b) => b.id === bAccountId)?.name || "";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        {/* B-Account */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted uppercase tracking-wider">B-Account</label>
          <select
            value={bAccountId}
            onChange={(e) => {
              setBAccountId(e.target.value);
              setGroupFilter("");
              setSelectedUser("");
              setFocusedLine(null);
            }}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs min-w-[100px]"
          >
            {bAccounts.map((ba) => (
              <option key={ba.id} value={ba.id}>{ba.name}</option>
            ))}
          </select>
        </div>

        {/* Group */}
        {groups.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted uppercase tracking-wider">Group</label>
            <select
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setSelectedUser("");
                setFocusedLine(null);
              }}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs min-w-[100px]"
            >
              <option value="">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* User */}
        {allUsers.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted uppercase tracking-wider">User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs min-w-[100px]"
            >
              <option value="">All Users</option>
              {allUsers.map((u) => (
                <option key={u.memberId} value={u.memberId}>{u.memberName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Chart View Toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted uppercase tracking-wider">View</label>
          <div className="flex gap-1">
            <button
              onClick={() => setChartView("line")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                chartView === "line" ? "bg-accent text-background" : "bg-surface text-muted border border-border"
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartView("bar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                chartView === "bar" ? "bg-accent text-background" : "bg-surface text-muted border border-border"
              }`}
            >
              Bar
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-[300px] shimmer bg-surface rounded-xl" />
        </div>
      ) : !data || allUsers.length === 0 ? (
        <div className="text-center py-8 text-muted">
          <p className="text-sm">No data available for the last 7 days</p>
        </div>
      ) : selectedUser && selectedUserData ? (
        /* === LEVEL 3: Single user selected === */
        <div className="bg-surface/50 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
              {selectedUserData.memberName}
              <span className="text-muted font-normal ml-2 text-xs">{selectedUserData.groupName}</span>
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span>Avg: {formatCurrency(selectedUserData.avgAmount)}</span>
              <span>Range: {formatCurrency(selectedUserData.minAmount)} - {formatCurrency(selectedUserData.maxAmount)}</span>
              <span className={selectedUserData.fluctuationPct > 100 ? "text-danger font-bold" : selectedUserData.fluctuationPct >= 50 ? "text-warning font-bold" : "text-success font-bold"}>
                {selectedUserData.fluctuationPct}%
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {chartView === "bar" ? (
              <BarChart data={singleUserBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                <Tooltip contentStyle={{ backgroundColor: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border)", fontSize: "12px" }} formatter={((v: number) => [formatCurrency(v), "Amount"]) as any} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {singleUserBarData.map((_, i) => (
                    <Cell key={i} fill={COLORS[0]} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={singleUserBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                <Tooltip contentStyle={{ backgroundColor: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border)", fontSize: "12px" }} formatter={((v: number) => [formatCurrency(v), "Amount"]) as any} />
                <Line type="monotone" dataKey="amount" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : groupFilter ? (
        /* === LEVEL 2: Group selected, no specific user === */
        <div className="space-y-4">
          <div className="bg-surface/50 rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
              {selectedBName} — {groups.find((g) => g.id === groupFilter)?.name || "Group"} — Last 7 Days
            </h3>
            {chartView === "line" ? (
              <div>
                {focusedLine && (
                  <button
                    onClick={() => setFocusedLine(null)}
                    className="text-[10px] text-accent mb-1 hover:underline"
                  >
                    Show all lines
                  </button>
                )}
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={allUsersLineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border)", fontSize: "12px" }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={((v: any, name: any) => { const u = allUsers.find(u => u.memberId === String(name)); return [formatCurrency(Number(v)), u?.memberName || ""]; }) as any}
                    />
                    <Legend formatter={(value: string) => { const u = allUsers.find(u => u.memberId === value); return u?.memberName || value; }} />
                    {allUsers.map((u, i) => (
                      <Line
                        key={u.memberId}
                        type="monotone"
                        dataKey={u.memberId}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={focusedLine === u.memberId ? 3 : focusedLine ? 0.5 : 2}
                        strokeOpacity={focusedLine && focusedLine !== u.memberId ? 0.15 : 1}
                        dot={false}
                        activeDot={{ r: 4, cursor: "pointer", onClick: () => setFocusedLine(focusedLine === u.memberId ? null : u.memberId) }}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              /* Bar chart: one chart per date, bars = users */
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {allDates.map((date) => (
                  <div key={date} className="bg-background/50 rounded-xl p-3">
                    <p className="text-xs text-muted mb-2 font-medium">{date.slice(5)}</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={allUsers.map((u, i) => ({
                        name: u.memberName,
                        amount: u.dailyAmounts.find((d) => d.date === date)?.amount || 0,
                        fill: COLORS[i % COLORS.length],
                      }))} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--color-muted)" }} interval={0} angle={-30} textAnchor="end" height={40} />
                        <YAxis tick={{ fontSize: 9, fill: "var(--color-muted)" }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                        <Tooltip contentStyle={{ backgroundColor: "var(--color-surface)", borderRadius: "8px", border: "1px solid var(--color-border)", fontSize: "11px" }} formatter={((v: number) => [formatCurrency(v), "Amount"]) as any} />
                        <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                          {allUsers.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* === LEVEL 1: B-Account only — heat map + line/bar chart === */
        <div className="space-y-4">
          {/* Heat Map */}
          <div className="bg-surface/50 rounded-xl border border-border p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
              {selectedBName} — All Users — Last 7 Days
            </h3>
            <div className="min-w-[400px]">
              {/* Header: dates */}
              <div className="flex items-center gap-0.5 mb-1">
                <div className="w-[80px] sm:w-[100px] shrink-0" />
                {allDates.map((d) => (
                  <div key={d} className="flex-1 text-center text-[9px] text-muted">{d.slice(5)}</div>
                ))}
              </div>
              {/* Rows: users */}
              <div className="space-y-0.5">
                {heatMapData.map((user) => (
                  <button
                    key={user.memberId}
                    onClick={() => setSelectedUser(user.memberId)}
                    className="w-full flex items-center gap-0.5 hover:bg-surface-hover/50 rounded-lg transition-colors py-0.5"
                  >
                    <div className="w-[80px] sm:w-[100px] shrink-0 text-left">
                      <span className="text-[10px] font-medium truncate block">{user.memberName}</span>
                      <span className="text-[8px] text-muted">{user.groupName}</span>
                    </div>
                    {user.cells.map((cell) => (
                      <div
                        key={cell.date}
                        className="flex-1 h-7 rounded-sm flex items-center justify-center text-[8px] font-bold"
                        style={{
                          backgroundColor: cell.amount === 0
                            ? "rgba(160, 168, 196, 0.1)"
                            : `rgba(74, 222, 128, ${0.15 + cell.intensity * 0.7})`,
                          color: cell.intensity > 0.5 ? "#fff" : "var(--color-muted)",
                        }}
                        title={`${user.memberName}: ${formatCurrency(cell.amount)} on ${cell.date}`}
                      >
                        {cell.amount > 0 ? (cell.amount >= 1000 ? `${(cell.amount / 1000).toFixed(0)}k` : cell.amount) : ""}
                      </div>
                    ))}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Line / Bar Chart */}
          <div className="bg-surface/50 rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
              {chartView === "line" ? "Daily Trends" : "User Comparison"}
            </h3>
            {chartView === "line" ? (
              <div>
                {focusedLine && (
                  <button
                    onClick={() => setFocusedLine(null)}
                    className="text-[10px] text-accent mb-1 hover:underline"
                  >
                    Show all lines
                  </button>
                )}
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={allUsersLineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border)", fontSize: "12px" }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={((v: any, name: any) => { const u = allUsers.find(u => u.memberId === String(name)); return [formatCurrency(Number(v)), u?.memberName || ""]; }) as any}
                    />
                    {allUsers.map((u, i) => (
                      <Line
                        key={u.memberId}
                        type="monotone"
                        dataKey={u.memberId}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={focusedLine === u.memberId ? 3 : focusedLine ? 0.5 : 1.5}
                        strokeOpacity={focusedLine && focusedLine !== u.memberId ? 0.15 : 1}
                        dot={false}
                        activeDot={{ r: 3, cursor: "pointer", onClick: () => setFocusedLine(focusedLine === u.memberId ? null : u.memberId) }}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={allUsersBarData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--color-muted)" }} interval={0} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border)", fontSize: "12px" }} />
                  {allDates.map((date, i) => (
                    <Bar key={date} dataKey={date} name={date.slice(5)} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
            {/* Legend for line chart */}
            {chartView === "line" && allUsers.length <= 20 && (
              <div className="flex flex-wrap gap-2 mt-3 px-1">
                {allUsers.map((u, i) => (
                  <button
                    key={u.memberId}
                    onClick={() => setFocusedLine(focusedLine === u.memberId ? null : u.memberId)}
                    className={`flex items-center gap-1 transition-opacity ${
                      focusedLine && focusedLine !== u.memberId ? "opacity-30" : "hover:opacity-80"
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] text-muted">{u.memberName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
