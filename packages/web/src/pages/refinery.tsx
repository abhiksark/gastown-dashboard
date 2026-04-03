import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { Rig } from "@/lib/types";
import { GitMerge } from "lucide-react";

interface MergeRequest {
  id: string;
  status: string;
  priority: number;
  branch: string;
  worker: string;
  age: string;
}

export function RefineryPage() {
  const { data: rigs, loading: rigsLoading } = useFetch<Rig[]>("/rigs", 10000);
  const { data: queues, loading: queuesLoading, error } = useFetch<
    Record<string, MergeRequest[]>
  >("/refinery", 10000);

  const loading = rigsLoading || queuesLoading;

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load refinery: {error}</div>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Refinery</h2>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const rigNames = rigs ? rigs.map((r) => r.name) : [];
  const hasAnyMRs = queues
    ? Object.values(queues).some((q) => q.length > 0)
    : false;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Refinery</h2>

      {!hasAnyMRs ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <GitMerge className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">All merge queues empty</p>
          <p className="text-zinc-600 text-xs mt-1">
            Merge requests appear here when polecats submit work via gt done
          </p>
        </div>
      ) : null}

      {rigNames.map((rigName) => {
        const mrs = queues?.[rigName] || [];
        const rig = rigs?.find((r) => r.name === rigName);

        return (
          <div
            key={rigName}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-zinc-200">
                  {rigName}
                </h3>
                <span className="text-xs text-zinc-500">
                  {mrs.length} merge request{mrs.length !== 1 ? "s" : ""}
                </span>
              </div>
              {rig && <StatusBadge status={rig.refinery} />}
            </div>

            {mrs.length === 0 ? (
              <div className="px-4 py-6 text-center text-zinc-600 text-xs">
                Queue empty
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      ID
                    </th>
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      Status
                    </th>
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      Priority
                    </th>
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      Branch
                    </th>
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      Worker
                    </th>
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      Age
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mrs.map((mr) => (
                    <tr
                      key={mr.id}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors"
                    >
                      <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                        {mr.id}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={mr.status} />
                      </td>
                      <td className="px-4 py-2 text-zinc-400 tabular-nums text-xs">
                        P{mr.priority}
                      </td>
                      <td className="px-4 py-2 text-zinc-400 font-mono text-xs truncate max-w-[200px]">
                        {mr.branch}
                      </td>
                      <td className="px-4 py-2 text-zinc-400 text-xs">
                        {mr.worker}
                      </td>
                      <td className="px-4 py-2 text-zinc-500 text-xs">
                        {mr.age}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
