import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { ClipboardList } from "lucide-react";

interface AuditEntry {
  ts: string;
  action: string;
  endpoint: string;
  method: string;
  params: Record<string, string>;
  body: unknown;
  status: number;
  user: string;
}

export function AuditPage() {
  const { data, loading, error } = useFetch<AuditEntry[]>("/audit?limit=200", 10000);
  const [actionFilter, setActionFilter] = useState<string>("all");

  const actions = useMemo(() => {
    if (!data) return ["all"];
    const set = new Set(data.map((e) => e.action));
    return ["all", ...Array.from(set).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (actionFilter === "all") return data;
    return data.filter((e) => e.action === actionFilter);
  }, [data, actionFilter]);

  if (error) return <div className="text-red-400 text-sm">Failed to load audit log: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Audit Log</h2>
        <div className="flex gap-1 flex-wrap">
          {actions.map((a) => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                actionFilter === a
                  ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <ClipboardList className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No audit entries</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Time</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Action</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Endpoint</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Details</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Result</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr
                  key={`${entry.ts}-${i}`}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors"
                >
                  <td className="px-4 py-2 text-xs text-zinc-500 tabular-nums whitespace-nowrap">
                    {new Date(entry.ts).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-200 font-medium">{entry.action}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500 truncate max-w-xs">
                    {entry.method} {entry.endpoint}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-400 truncate max-w-xs">
                    {entry.body && typeof entry.body === "object" && Object.keys(entry.body as object).length > 0
                      ? JSON.stringify(entry.body)
                      : "\u2014"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        entry.status >= 200 && entry.status < 300
                          ? "bg-emerald-500/10 text-emerald-400"
                          : entry.status >= 400
                            ? "bg-red-500/10 text-red-400"
                            : "bg-zinc-500/10 text-zinc-400"
                      }`}
                    >
                      {entry.status || "\u2014"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
