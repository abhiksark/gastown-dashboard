import { useState } from "react";
import { Link } from "react-router";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import { ConvoyTimeline } from "@/components/convoy-timeline";
import { CreateConvoyDialog } from "@/components/create-convoy-dialog";
import { AddBeadsDialog } from "@/components/add-beads-dialog";
import { InlineConfirm } from "@/components/inline-confirm";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Convoy } from "@/lib/types";
import { Truck, LayoutGrid, GanttChart, Plus, ChevronDown, ChevronRight, Archive, Mountain as MountainIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "cards" | "timeline";

export function ConvoysPage() {
  const { data, loading, error, refetch } = useFetch<Convoy[]>("/convoys", 10000);
  const [view, setView] = useState<ViewMode>("cards");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [addBeadsFor, setAddBeadsFor] = useState<Convoy | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const { addToast } = useToast();

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleArchive(convoy: Convoy) {
    setActing(convoy.id);
    try {
      await apiPost(`/convoys/${encodeURIComponent(convoy.id)}/archive`);
      addToast(`Convoy ${convoy.id} archived`, "success");
      refetch();
    } catch (err: any) {
      addToast(`Failed: ${err.message}`, "error");
    } finally {
      setActing(null);
    }
  }

  async function handleActivateMountain(convoy: Convoy) {
    setActing(convoy.id);
    try {
      await apiPost("/mountains/activate", { epic: convoy.id });
      addToast(`Mountain activated for ${convoy.id}`, "success");
      refetch();
    } catch (err: any) {
      addToast(`Failed: ${err.message}`, "error");
    } finally {
      setActing(null);
    }
  }

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load convoys: {error}</div>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Convoys</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-36 rounded-lg skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Convoys</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Convoy
          </button>
          <div className="flex items-center rounded-md border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => setView("cards")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                view === "cards"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              onClick={() => setView("timeline")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-[var(--color-border)]",
                view === "timeline"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              )}
            >
              <GanttChart className="h-3.5 w-3.5" />
              Timeline
            </button>
          </div>
        </div>
      </div>

      {view === "timeline" ? (
        <ConvoyTimeline />
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <Truck className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No active convoys</p>
          <p className="text-zinc-600 text-xs mt-1">
            Create one with the "New Convoy" button above
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((convoy) => {
            const total = convoy.total || 0;
            const done = convoy.done || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isExpanded = expanded.has(convoy.id);
            const beadIds = (convoy.beads || []).map((b) => b.id);
            return (
              <div
                key={convoy.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 hover:bg-[var(--color-card-hover)] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {convoy.title}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      {convoy.id}
                    </p>
                  </div>
                  <StatusBadge status={convoy.status} />
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>{done}/{total} beads</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-3 text-xs">
                  {convoy.active > 0 && (
                    <span className="text-blue-400">{convoy.active} active</span>
                  )}
                  {convoy.blocked > 0 && (
                    <span className="text-red-400">{convoy.blocked} blocked</span>
                  )}
                  {convoy.pending > 0 && (
                    <span className="text-zinc-500">{convoy.pending} pending</span>
                  )}
                </div>

                {/* Expand/Action bar */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => toggleExpand(convoy.id)}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    {isExpanded ? "Hide" : "Show"} beads
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setAddBeadsFor(convoy)}
                      className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add Beads
                    </button>

                    <InlineConfirm
                      onConfirm={() => handleActivateMountain(convoy)}
                      confirmLabel="Activate?"
                      disabled={acting === convoy.id}
                      className="flex items-center gap-1 rounded-md border border-emerald-500/30 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                    >
                      <MountainIcon className="h-3 w-3" />
                      Mountain
                    </InlineConfirm>

                    <InlineConfirm
                      onConfirm={() => handleArchive(convoy)}
                      confirmLabel="Archive?"
                      variant="danger"
                      disabled={acting === convoy.id}
                      className="flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      <Archive className="h-3 w-3" />
                      Archive
                    </InlineConfirm>
                  </div>
                </div>

                {/* Expanded bead list */}
                {isExpanded && convoy.beads && convoy.beads.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-1.5">
                    {convoy.beads.map((b) => (
                      <Link
                        key={b.id}
                        to="/beads"
                        className="flex items-center justify-between text-xs hover:bg-zinc-800/50 rounded px-1 -mx-1 py-0.5 transition-colors"
                      >
                        <span className="text-zinc-400 truncate max-w-[50%]">
                          {b.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-zinc-600">{b.id}</span>
                          <StatusBadge status={b.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {isExpanded && (!convoy.beads || convoy.beads.length === 0) && (
                  <p className="mt-3 pt-3 border-t border-[var(--color-border)] text-xs text-zinc-600 italic">
                    No beads in this convoy
                  </p>
                )}

                <p className="text-[10px] text-zinc-600 mt-3">
                  {new Date(convoy.created_at).toLocaleDateString()}
                  {convoy.owner && ` · ${convoy.owner}`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <CreateConvoyDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refetch}
      />

      {addBeadsFor && (
        <AddBeadsDialog
          open={true}
          convoyId={addBeadsFor.id}
          existingBeadIds={(addBeadsFor.beads || []).map((b) => b.id)}
          onClose={() => setAddBeadsFor(null)}
          onAdded={refetch}
        />
      )}
    </div>
  );
}
