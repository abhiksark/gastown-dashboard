import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { PullRequest } from "@/lib/types";
import { GitPullRequest, ExternalLink, Server } from "lucide-react";

type PRFilter = "all" | "OPEN" | "MERGED" | "CLOSED";

const STATE_COLORS: Record<string, string> = {
  OPEN: "bg-emerald-500/10 text-emerald-400",
  MERGED: "bg-purple-500/10 text-purple-400",
  CLOSED: "bg-red-500/10 text-red-400",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PRsPage() {
  const { data, loading, error } = useFetch<Record<string, PullRequest[] | string>>("/prs", 30000);
  const [filter, setFilter] = useState<PRFilter>("all");

  const rigs = useMemo(() => {
    if (!data) return [];
    return Object.entries(data).map(([rig, prsOrLocal]) => ({
      rig,
      local: prsOrLocal === "local",
      prs: Array.isArray(prsOrLocal) ? prsOrLocal : [],
    }));
  }, [data]);

  const filteredRigs = useMemo(() => {
    return rigs.map((r) => ({
      ...r,
      prs: filter === "all" ? r.prs : r.prs.filter((pr) => pr.state === filter),
    }));
  }, [rigs, filter]);

  const totalCounts = useMemo(() => {
    const all = rigs.flatMap((r) => r.prs);
    return {
      all: all.length,
      OPEN: all.filter((p) => p.state === "OPEN").length,
      MERGED: all.filter((p) => p.state === "MERGED").length,
      CLOSED: all.filter((p) => p.state === "CLOSED").length,
    };
  }, [rigs]);

  if (error) return <div className="text-red-400 text-sm">Failed to load PRs: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Pull Requests</h2>
        <div className="flex gap-1">
          {(["all", "OPEN", "MERGED", "CLOSED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize ${
                filter === s
                  ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {s.toLowerCase()}{totalCounts[s] > 0 ? ` (${totalCounts[s]})` : ""}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-40 rounded-lg skeleton" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRigs.map(({ rig, local, prs }) => (
            <div
              key={rig}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-zinc-200">{rig}</h3>
                  <span className="text-xs text-zinc-500">
                    {local ? "local rig" : `${prs.length} PR${prs.length !== 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>

              {local ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-zinc-600">Local rig — no GitHub PRs</p>
                </div>
              ) : prs.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-zinc-600">No PRs{filter !== "all" ? ` matching "${filter.toLowerCase()}"` : ""}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">#</th>
                      <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Title</th>
                      <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">State</th>
                      <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Author</th>
                      <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Branch</th>
                      <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prs.map((pr) => (
                      <tr key={pr.number} className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors table-row-hover">
                        <td className="px-4 py-2 text-xs text-zinc-500 tabular-nums">#{pr.number}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-zinc-200 hover:text-zinc-100 hover:underline truncate max-w-sm"
                            >
                              {pr.title}
                            </a>
                            <ExternalLink className="h-2.5 w-2.5 text-zinc-600 shrink-0" />
                            {pr.isDraft && (
                              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 shrink-0">draft</span>
                            )}
                          </div>
                          {pr.labels.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {pr.labels.map((l) => (
                                <span key={l.name} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">{l.name}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATE_COLORS[pr.state] || "bg-zinc-500/10 text-zinc-400"}`}>
                            {pr.state.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-400">{pr.author.login}</td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-500 truncate max-w-[200px]">{pr.headRefName}</td>
                        <td className="px-4 py-2 text-xs text-zinc-500 whitespace-nowrap">{relativeTime(pr.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}

          {filteredRigs.length === 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
              <GitPullRequest className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No rigs found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
