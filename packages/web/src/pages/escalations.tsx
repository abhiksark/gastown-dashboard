import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import { InlineConfirm } from "@/components/inline-confirm";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Escalation } from "@/lib/types";
import { AlertTriangle, CheckCircle } from "lucide-react";

export function EscalationsPage() {
  const { data, loading, error, refetch } = useFetch<Escalation[]>(
    "/escalations",
    10000
  );
  const [acting, setActing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { addToast } = useToast();

  const statuses = ["all", "open", "acknowledged", "resolved", "closed"];

  const filtered = data
    ? statusFilter === "all"
      ? data
      : data.filter((e) => e.status === statusFilter)
    : [];

  // Sort: open first, then by severity (critical > high > medium > low)
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const sorted = [...filtered].sort((a, b) => {
    // Open before closed
    if (a.status === "open" && b.status !== "open") return -1;
    if (a.status !== "open" && b.status === "open") return 1;
    // Then by severity
    return (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
  });

  async function handleAck(id: string) {
    setActing(id);
    try {
      await apiPost(`/escalations/${id}/ack`);
      addToast("Escalation acknowledged", "success");
      refetch();
    } catch {
      addToast("Failed to acknowledge escalation", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleClose(id: string) {
    setActing(id);
    try {
      await apiPost(`/escalations/${id}/close`, {
        reason: "Resolved from dashboard",
      });
      addToast("Escalation resolved", "success");
      refetch();
    } catch {
      addToast("Failed to resolve escalation", "error");
    } finally {
      setActing(null);
    }
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load escalations: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Escalations</h2>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg skeleton"
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-800 mx-auto mb-3" />
          <p className="text-emerald-400 text-sm font-medium">All clear</p>
          <p className="text-zinc-600 text-xs mt-1">No escalations to review</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((esc) => (
            <div
              key={esc.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:bg-[var(--color-card-hover)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      esc.severity === "critical"
                        ? "text-red-400"
                        : esc.severity === "high"
                          ? "text-orange-400"
                          : esc.severity === "medium"
                            ? "text-amber-400"
                            : "text-zinc-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-zinc-200">{esc.description}</p>
                    <div className="flex gap-2 mt-1.5 text-xs text-zinc-500">
                      <span>{esc.source_agent}</span>
                      {esc.rig && (
                        <>
                          <span className="text-zinc-700">&middot;</span>
                          <span>{esc.rig}</span>
                        </>
                      )}
                      <span className="text-zinc-700">&middot;</span>
                      <span>
                        {new Date(esc.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <StatusBadge status={esc.severity} />
                  <StatusBadge status={esc.status} />
                </div>
              </div>

              {esc.status === "open" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
                  <InlineConfirm
                    onConfirm={() => handleAck(esc.id)}
                    confirmLabel="Acknowledge?"
                    disabled={acting === esc.id}
                    className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors active:scale-[0.98] disabled:opacity-50"
                  >
                    {acting === esc.id ? "..." : "Acknowledge"}
                  </InlineConfirm>
                  <InlineConfirm
                    onConfirm={() => handleClose(esc.id)}
                    confirmLabel="Resolve?"
                    variant="danger"
                    disabled={acting === esc.id}
                    className="rounded-md border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors active:scale-[0.98] disabled:opacity-50"
                  >
                    {acting === esc.id ? "..." : "Resolve"}
                  </InlineConfirm>
                </div>
              )}

              {esc.status === "acknowledged" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
                  <InlineConfirm
                    onConfirm={() => handleClose(esc.id)}
                    confirmLabel="Resolve?"
                    variant="danger"
                    disabled={acting === esc.id}
                    className="rounded-md border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors active:scale-[0.98] disabled:opacity-50"
                  >
                    {acting === esc.id ? "..." : "Resolve"}
                  </InlineConfirm>
                </div>
              )}

              {esc.reason && (
                <p className="text-xs text-zinc-600 mt-2">
                  Reason: {esc.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
