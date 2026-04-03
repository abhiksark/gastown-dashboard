import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { Formula, MoleculeStatus } from "@/lib/types";
import { FlaskConical, Workflow, Layers, Target, Expand } from "lucide-react";

const typeIcons: Record<string, typeof FlaskConical> = {
  workflow: Workflow,
  convoy: Layers,
  aspect: Target,
  expansion: Expand,
};

const typeColors: Record<string, string> = {
  workflow: "text-blue-400",
  convoy: "text-purple-400",
  aspect: "text-amber-400",
  expansion: "text-emerald-400",
};

export function WorkflowsPage() {
  const { data: formulas, loading, error } = useFetch<Formula[]>("/formulas", 30000);
  const { data: molStatus } = useFetch<MoleculeStatus>("/formulas/molecules/status", 10000);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const types = ["all", "workflow", "convoy", "expansion", "aspect"];

  const filtered = formulas
    ? formulas
        .filter((f) => typeFilter === "all" || f.type === typeFilter)
        .filter(
          (f) =>
            !search ||
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.description.toLowerCase().includes(search.toLowerCase())
        )
    : [];

  // Group by type for counts
  const typeCounts = formulas
    ? formulas.reduce<Record<string, number>>(
        (acc, f) => {
          acc[f.type] = (acc[f.type] || 0) + 1;
          acc.all = (acc.all || 0) + 1;
          return acc;
        },
        { all: 0 }
      )
    : {};

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load formulas: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Workflows</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search formulas..."
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500 w-56"
        />
      </div>

      {/* Active molecule status */}
      {molStatus && molStatus.status !== "naked" && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-zinc-100">Active Molecule</span>
            </div>
            <StatusBadge status={molStatus.status} />
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            {molStatus.formula && <span>Formula: <span className="text-zinc-200">{molStatus.formula}</span></span>}
            {molStatus.bead && <span>Bead: <span className="text-zinc-200 font-mono">{molStatus.bead}</span></span>}
            <span>Agent: <span className="text-zinc-200">{molStatus.identity}</span></span>
          </div>
          {molStatus.steps_total > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>{molStatus.steps_complete}/{molStatus.steps_total} steps</span>
                <span>{Math.round((molStatus.steps_complete / molStatus.steps_total) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${(molStatus.steps_complete / molStatus.steps_total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-1">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === t
                ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {t}{typeCounts[t] !== undefined ? ` (${typeCounts[t]})` : ""}
          </button>
        ))}
      </div>

      {/* Formula grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 rounded-lg skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <FlaskConical className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No formulas found</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((formula) => {
            const Icon = typeIcons[formula.type] || FlaskConical;
            const color = typeColors[formula.type] || "text-zinc-400";

            return (
              <div
                key={formula.name}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:bg-[var(--color-card-hover)] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                    <h3 className="text-sm font-medium text-zinc-100 truncate">
                      {formula.name}
                    </h3>
                  </div>
                  <StatusBadge status={formula.type} />
                </div>

                <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                  {formula.description}
                </p>

                <div className="flex items-center gap-3 text-xs text-zinc-600">
                  {formula.steps > 0 && (
                    <span>{formula.steps} step{formula.steps !== 1 ? "s" : ""}</span>
                  )}
                  {formula.vars > 0 && (
                    <span>{formula.vars} var{formula.vars !== 1 ? "s" : ""}</span>
                  )}
                  {formula.steps === 0 && formula.vars === 0 && (
                    <span>template</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
