"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Cell,
} from "recharts";
import { fetcher } from "@/lib/fetcher";
import { formatCurrency, getISTDate, shiftDate } from "@/lib/utils";

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(() => {
    if (range === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    const endDate = getISTDate();
    const startDate = shiftDate(endDate, range === "30d" ? -30 : -7);
    return { startDate, endDate };
  }, [range, customStart, customEnd]);

  const shouldFetch = range !== "custom" || (customStart && customEnd);
  const { data = [], isLoading } = useSWR<ChartDataPoint[]>(
    shouldFetch ? `/api/master/chart-data?startDate=${startDate}&endDate=${endDate}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  const chartData = useMemo(() =>
    data.map((d) => ({
      ...d,
      label: d.date.slice(5), // MM-DD
      fullDate: d.date,
      absDiff: Math.abs(d.difference),
      hasDiff: d.difference !== 0 && (d.pTotal > 0 || d.nTotal > 0 || d.qTotal > 0),
    })),
    [data]
  );

  const selectedPoint = useMemo(() =>
    chartData.find((d) => d.fullDate === selectedDate),
    [chartData, selectedDate]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = useCallback((data: any) => {
    if (data && data.fullDate) {
      setSelectedDate(data.fullDate === selectedDate ? null : data.fullDate as string);
    }
  }, [selectedDate]);

  return (
    <div className="space-y-4">
      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2">
        {(["7d", "30d", "custom"] as RangeOption[]).map((r) => (
          <button
            key={r}
            onClick={() => { setRange(r); setSelectedDate(null); }}
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

      {/* Selected date detail card */}
      {selectedPoint && (
        <div className={`rounded-xl p-4 border ${
          selectedPoint.difference === 0 ? "bg-success/5 border-success/20" : "bg-danger/5 border-danger/20"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">{selectedPoint.fullDate}</span>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-muted hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted">P-Total</span>
              <p className="font-bold text-sm">{formatCurrency(selectedPoint.pTotal)}</p>
            </div>
            <div>
              <span className="text-muted">Q-Total</span>
              <p className="font-bold text-sm">{formatCurrency(selectedPoint.qTotal)}</p>
            </div>
            <div>
              <span className="text-muted">N-Total</span>
              <p className="font-bold text-sm">{formatCurrency(selectedPoint.nTotal)}</p>
            </div>
            <div>
              <span className="text-muted">Difference</span>
              <p className={`font-bold text-sm ${
                selectedPoint.difference === 0 ? "text-success" : "text-danger"
              }`}>
                {selectedPoint.difference === 0 ? "0" : formatCurrency(Math.abs(selectedPoint.difference))}
                {selectedPoint.difference !== 0 && (
                  <span className="text-[10px] font-normal ml-1">
                    {selectedPoint.difference > 0 ? "excess" : "deficit"}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="h-64 shimmer bg-surface rounded-xl" />
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-muted">
          No data for selected range
        </div>
      ) : (
        <div>
          <p className="text-[10px] text-muted mb-2">Click a bar to inspect details</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #333)" opacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-muted, #888)" }}
                axisLine={{ stroke: "var(--color-border, #333)" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted, #888)" }}
                axisLine={{ stroke: "var(--color-border, #333)" }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
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
              <Bar dataKey="pTotal" radius={[3, 3, 0, 0]} name="pTotal" onClick={handleBarClick} cursor="pointer">
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.fullDate === selectedDate ? "var(--color-accent, #f59e0b)" : "rgba(245, 158, 11, 0.6)"}
                  />
                ))}
              </Bar>
              <Bar dataKey="qTotal" radius={[3, 3, 0, 0]} name="qTotal" onClick={handleBarClick} cursor="pointer">
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.fullDate === selectedDate ? "var(--color-warning, #eab308)" : "rgba(234, 179, 8, 0.4)"}
                  />
                ))}
              </Bar>
              <Bar dataKey="nTotal" radius={[3, 3, 0, 0]} name="nTotal" onClick={handleBarClick} cursor="pointer">
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.fullDate === selectedDate ? "var(--color-muted, #888)" : "rgba(136, 136, 136, 0.4)"}
                  />
                ))}
              </Bar>
              <Bar dataKey="absDiff" radius={[3, 3, 0, 0]} name="difference" onClick={handleBarClick} cursor="pointer">
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.hasDiff
                      ? (entry.fullDate === selectedDate ? "var(--color-danger, #ef4444)" : "rgba(239, 68, 68, 0.7)")
                      : (entry.fullDate === selectedDate ? "var(--color-success, #22c55e)" : "rgba(34, 197, 94, 0.5)")
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3 justify-center">
            {[
              { label: "P-Total", color: "rgba(245, 158, 11, 0.6)" },
              { label: "Q-Total", color: "rgba(234, 179, 8, 0.4)" },
              { label: "N-Total", color: "rgba(136, 136, 136, 0.4)" },
              { label: "Diff (match)", color: "rgba(34, 197, 94, 0.5)" },
              { label: "Diff (mismatch)", color: "rgba(239, 68, 68, 0.7)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-muted">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
