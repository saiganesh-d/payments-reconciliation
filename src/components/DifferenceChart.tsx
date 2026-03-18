"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";
import { fetcher } from "@/lib/fetcher";
import { formatCurrency } from "@/lib/utils";

interface ChartDataPoint {
  date: string;
  pTotal: number;
  nTotal: number;
  qTotal: number;
  difference: number;
}

type RangeOption = "7d" | "30d" | "custom";

export default function DifferenceChart() {
  const [range, setRange] = useState<RangeOption>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const { startDate, endDate } = useMemo(() => {
    if (range === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (range === "30d" ? 30 : 7));
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, [range, customStart, customEnd]);

  const shouldFetch = range !== "custom" || (customStart && customEnd);
  const { data = [], isLoading } = useSWR<ChartDataPoint[]>(
    shouldFetch ? `/api/master/chart-data?startDate=${startDate}&endDate=${endDate}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  const chartData = data.map((d) => ({
    ...d,
    date: d.date.slice(5), // MM-DD format
  }));

  return (
    <div className="space-y-4">
      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2">
        {(["7d", "30d", "custom"] as RangeOption[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === r
                ? "bg-accent text-background"
                : "bg-surface text-muted border border-border hover:text-foreground"
            }`}
          >
            {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "Custom"}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-accent/50"
            />
            <span className="text-xs text-muted">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-accent/50"
            />
          </div>
        )}
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-64 shimmer bg-surface rounded-xl" />
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-muted">
          No data for selected range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #333)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--color-muted, #888)" }}
              axisLine={{ stroke: "var(--color-border, #333)" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-muted, #888)" }}
              axisLine={{ stroke: "var(--color-border, #333)" }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface, #1a1a1a)",
                border: "1px solid var(--color-border, #333)",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              formatter={(value: unknown, name: unknown) => [
                formatCurrency(Number(value)),
                String(name) === "pTotal" ? "P-Total" : String(name) === "qTotal" ? "Q-Total" : String(name) === "nTotal" ? "N-Total" : "Difference",
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <ReferenceLine y={0} stroke="var(--color-muted, #888)" strokeDasharray="3 3" />
            <Bar dataKey="pTotal" fill="var(--color-accent, #f59e0b)" radius={[4, 4, 0, 0]} name="pTotal" />
            <Bar dataKey="qTotal" fill="var(--color-warning, #eab308)" radius={[4, 4, 0, 0]} name="qTotal" />
            <Bar dataKey="nTotal" fill="var(--color-muted, #888)" radius={[4, 4, 0, 0]} name="nTotal" />
            <Bar dataKey="difference" fill="var(--color-success, #22c55e)" radius={[4, 4, 0, 0]} name="difference" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
