import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Wrench, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DoctorCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  fixable: boolean;
  details?: string[];
}

interface DoctorResult {
  checks: DoctorCheck[];
  summary: { total: number; pass: number; fail: number; warn: number };
}

const STATUS_ICON = {
  pass: CheckCircle2,
  fail: XCircle,
  warn: AlertTriangle,
} as const;

const STATUS_COLOR = {
  pass: "text-emerald-400",
  fail: "text-red-400",
  warn: "text-amber-400",
} as const;

// Group checks by category based on name prefix patterns
function categorize(name: string): string {
  if (name.startsWith("town-") || name.startsWith("global-") || name.startsWith("env-")) return "Workspace";
  if (name.startsWith("rig-") || name.startsWith("prefix-") || name.startsWith("default-branch") || name.startsWith("clone-") || name.startsWith("idle-timeout") || name.startsWith("routes-") || name.startsWith("routing-")) return "Rigs";
  if (name.startsWith("agent-") || name.startsWith("stale-agent") || name.startsWith("session-") || name.startsWith("orphan-") || name.startsWith("zombie-") || name.startsWith("identity-") || name.startsWith("linked-") || name.startsWith("socket-") || name.startsWith("themes")) return "Agents & Sessions";
  if (name.startsWith("beads-") || name.startsWith("dolt-") || name.startsWith("database-") || name.startsWith("stale-dolt") || name.startsWith("stale-sql") || name.startsWith("jsonl-") || name.startsWith("stale-beads")) return "Database & Beads";
  if (name.startsWith("patrol-") || name.startsWith("daemon") || name.startsWith("boot-") || name.startsWith("hooks-")) return "Patrols & Daemon";
  if (name.startsWith("wisp-") || name.startsWith("misclassified") || name.startsWith("overlay-")) return "Wisps & Cleanup";
  if (name.startsWith("claude-") || name.startsWith("crash-") || name.startsWith("land-") || name.startsWith("persistent-")) return "Configuration";
  return "Other";
}

export function DoctorPage() {
  const { data, loading, error, refetch } = useFetch<DoctorResult>("/doctor", 0);
  const [fixing, setFixing] = useState(false);
  const [running, setRunning] = useState(false);
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { addToast } = useToast();

  async function handleRunAll() {
    setRunning(true);
    await refetch();
    setRunning(false);
  }

  async function handleFix() {
    setFixing(true);
    try {
      await apiPost("/doctor/fix");
      addToast("Doctor fix complete — re-running checks", "success");
      await refetch();
    } catch (err: any) {
      addToast(`Fix failed: ${err.message}`, "error");
    } finally {
      setFixing(false);
    }
  }

  function toggleCheck(name: string) {
    setExpandedChecks((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const checks = data?.checks || [];
  const summary = data?.summary || { total: 0, pass: 0, fail: 0, warn: 0 };
  const fixableCount = checks.filter((c) => c.fixable && c.status !== "pass").length;

  const filteredChecks = statusFilter === "all"
    ? checks
    : checks.filter((c) => c.status === statusFilter);

  // Group by category
  const grouped: Record<string, DoctorCheck[]> = {};
  for (const check of filteredChecks) {
    const cat = categorize(check.name);
    (grouped[cat] ??= []).push(check);
  }

  if (error && !data) return <div className="text-red-400 text-sm">Failed to run doctor: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Doctor & Diagnostics</h2>
        <div className="flex gap-2">
          <button
            onClick={handleRunAll}
            disabled={running || loading}
            className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", (running || loading) && "animate-spin")} />
            Run All Checks
          </button>
          {fixableCount > 0 && (
            <button
              onClick={handleFix}
              disabled={fixing}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              <Wrench className="h-3 w-3" />
              {fixing ? "Fixing..." : `Fix ${fixableCount} issue${fixableCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          <button onClick={() => setStatusFilter("all")} className={cn("rounded-lg border p-3 text-center transition-colors", statusFilter === "all" ? "border-zinc-500 bg-zinc-800" : "border-[var(--color-border)] bg-[var(--color-card)]")}>
            <p className="text-lg font-semibold text-zinc-100 tabular-nums">{summary.total}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total</p>
          </button>
          <button onClick={() => setStatusFilter("pass")} className={cn("rounded-lg border p-3 text-center transition-colors", statusFilter === "pass" ? "border-emerald-500/50 bg-emerald-500/10" : "border-emerald-500/20 bg-emerald-500/5")}>
            <p className="text-lg font-semibold text-emerald-400 tabular-nums">{summary.pass}</p>
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider">Pass</p>
          </button>
          <button onClick={() => setStatusFilter("warn")} className={cn("rounded-lg border p-3 text-center transition-colors", statusFilter === "warn" ? "border-amber-500/50 bg-amber-500/10" : "border-amber-500/20 bg-amber-500/5")}>
            <p className="text-lg font-semibold text-amber-400 tabular-nums">{summary.warn}</p>
            <p className="text-[10px] text-amber-400/70 uppercase tracking-wider">Warn</p>
          </button>
          <button onClick={() => setStatusFilter("fail")} className={cn("rounded-lg border p-3 text-center transition-colors", statusFilter === "fail" ? "border-red-500/50 bg-red-500/10" : "border-red-500/20 bg-red-500/5")}>
            <p className="text-lg font-semibold text-red-400 tabular-nums">{summary.fail}</p>
            <p className="text-[10px] text-red-400/70 uppercase tracking-wider">Fail</p>
          </button>
        </div>
      )}

      {/* Check list grouped by category */}
      {loading && !data ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-10 rounded-lg skeleton" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, catChecks]) => (
            <div key={category} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{category}</h3>
              </div>
              <div>
                {catChecks.map((check) => {
                  const Icon = STATUS_ICON[check.status];
                  const color = STATUS_COLOR[check.status];
                  const hasDetails = check.details && check.details.length > 0;
                  const isExpanded = expandedChecks.has(check.name);

                  return (
                    <div key={check.name} className="border-b border-[var(--color-border)] last:border-b-0">
                      <div
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 transition-colors",
                          hasDetails ? "cursor-pointer hover:bg-[var(--color-card-hover)]" : ""
                        )}
                        onClick={() => hasDetails && toggleCheck(check.name)}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", color)} />
                        <span className="text-xs font-mono text-zinc-500 w-48 shrink-0 truncate">{check.name}</span>
                        <span className="text-xs text-zinc-300 flex-1 truncate">{check.message}</span>
                        {check.fixable && check.status !== "pass" && (
                          <span className="text-[10px] text-blue-400 bg-blue-400/10 rounded px-1.5 py-0.5 shrink-0">fixable</span>
                        )}
                        {hasDetails && (
                          <span className="text-zinc-600 shrink-0">
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                      {isExpanded && hasDetails && (
                        <div className="px-4 pb-3 pl-11">
                          <div className="space-y-0.5">
                            {check.details!.map((d, i) => (
                              <p key={i} className="text-[11px] text-zinc-500 font-mono">{d}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredChecks.length === 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
              <Stethoscope className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No checks match the current filter</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
