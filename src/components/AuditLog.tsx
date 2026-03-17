"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Shield,
  Unlock, Pencil, Trash2, Plus, RotateCcw, FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  actorName: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
}

const ACTION_CONFIG: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  unlock: { icon: Unlock, color: "text-warning", label: "Unlocked Entry" },
  edit: { icon: Pencil, color: "text-accent", label: "Edited" },
  create_group: { icon: Plus, color: "text-success", label: "Created Group" },
  rename_group: { icon: Pencil, color: "text-accent", label: "Renamed Group" },
  delete_group: { icon: Trash2, color: "text-danger", label: "Deleted Group" },
  add_member: { icon: Plus, color: "text-success", label: "Added Member" },
  rename_member: { icon: Pencil, color: "text-accent", label: "Renamed Member" },
  deactivate_member: { icon: Trash2, color: "text-danger", label: "Removed Member" },
  reactivate_member: { icon: RotateCcw, color: "text-success", label: "Reactivated Member" },
  create_n_name: { icon: Plus, color: "text-success", label: "Created N-Name" },
  rename_n_name: { icon: Pencil, color: "text-accent", label: "Renamed N-Name" },
  deactivate_n_name: { icon: Trash2, color: "text-danger", label: "Removed N-Name" },
  reactivate_n_name: { icon: RotateCcw, color: "text-success", label: "Reactivated N-Name" },
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function parseJSON(str: string | null): Record<string, unknown> | null {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

export default function AuditLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const perPage = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-log?limit=${perPage}&offset=${page * perPage}`);
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/master")}
          className="p-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>
            Audit Log
          </h1>
          <p className="text-xs text-muted">{total} total events</p>
        </div>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 shimmer bg-surface rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => {
            const config = ACTION_CONFIG[log.action] || {
              icon: FileText,
              color: "text-muted",
              label: log.action,
            };
            const Icon = config.icon;
            const oldVal = parseJSON(log.oldValue);
            const newVal = parseJSON(log.newValue);

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="glass-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-surface ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{config.label}</span>
                      <span className="text-xs text-muted">by {log.actorName}</span>
                    </div>

                    {/* Details */}
                    <div className="mt-1 text-xs text-muted space-y-0.5">
                      {oldVal && (
                        <p>
                          <span className="text-danger/70">Old:</span>{" "}
                          {Object.entries(oldVal).map(([k, v]) => `${k}: ${v}`).join(", ")}
                        </p>
                      )}
                      {newVal && (
                        <p>
                          <span className="text-success/70">New:</span>{" "}
                          {Object.entries(newVal).map(([k, v]) => `${k}: ${v}`).join(", ")}
                        </p>
                      )}
                    </div>

                    <p className="text-[10px] text-muted/60 mt-1.5">
                      {formatTimestamp(log.timestamp)}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {logs.length === 0 && (
            <div className="text-center py-12 text-muted">
              <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No audit events yet</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg bg-surface border border-border hover:bg-surface-hover disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-lg bg-surface border border-border hover:bg-surface-hover disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
