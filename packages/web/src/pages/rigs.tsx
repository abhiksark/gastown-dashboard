import { useState } from "react";
import { useNavigate } from "react-router";
import { useRealtime } from "@/hooks/use-realtime";
import { StatusBadge } from "@/components/status-badge";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Rig } from "@/lib/types";
import { Server, Plus, X } from "lucide-react";

export function RigsPage() {
  const { data, loading, error, refetch } = useRealtime<Rig[]>("/rigs", 10000);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addPath, setAddPath] = useState("");
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removeConfirmName, setRemoveConfirmName] = useState("");
  const [removing, setRemoving] = useState(false);

  async function handleAddRig() {
    if (!addPath.trim()) return;
    setAdding(true);
    try {
      await apiPost("/rigs/add", { path: addPath.trim() });
      addToast("Rig added successfully", "success");
      setAddDialogOpen(false);
      setAddPath("");
      refetch();
    } catch (err: any) {
      addToast(`Add rig failed: ${err.message}`, "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveRig() {
    if (!removeTarget || removeConfirmName !== removeTarget) return;
    setRemoving(true);
    try {
      await apiPost(`/rigs/${encodeURIComponent(removeTarget)}/remove`);
      addToast(`Rig ${removeTarget} removed`, "success");
      setRemoveTarget(null);
      setRemoveConfirmName("");
      refetch();
    } catch (err: any) {
      addToast(`Remove failed: ${err.message}`, "error");
    } finally {
      setRemoving(false);
    }
  }

  if (error) return <div className="text-red-400 text-sm">Failed to load rigs: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Rigs</h2>
        <button
          onClick={() => setAddDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-800 hover:bg-emerald-900/50 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Rig
        </button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <div key={i} className="h-40 rounded-lg skeleton" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((rig) => (
            <div key={rig.name} className="relative rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 hover:bg-[var(--color-card-hover)] transition-colors cursor-pointer" onClick={() => navigate(`/rigs/${rig.name}`)}>
              <button
                onClick={(e) => { e.stopPropagation(); setRemoveTarget(rig.name); }}
                className="absolute top-3 right-3 rounded p-1 text-zinc-600 hover:text-red-400 hover:bg-red-900/30 transition-colors"
                title="Remove rig"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-start justify-between pr-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-zinc-800 p-2"><Server className="h-4 w-4 text-zinc-400" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{rig.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">prefix: {rig.beads_prefix}</p>
                  </div>
                </div>
                <StatusBadge status={rig.status} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-md bg-zinc-900 p-2.5 text-center">
                  <p className="text-lg font-semibold text-zinc-100 tabular-nums">{rig.polecats}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Polecats</p>
                </div>
                <div className="rounded-md bg-zinc-900 p-2.5 text-center">
                  <p className="text-lg font-semibold text-zinc-100 tabular-nums">{rig.crew}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Crew</p>
                </div>
                <div className="rounded-md bg-zinc-900 p-2.5 text-center">
                  <StatusBadge status={rig.witness} />
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Witness</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="text-zinc-500">Refinery: <span className={rig.refinery === "running" ? "text-emerald-400" : "text-zinc-600"}>{rig.refinery}</span></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-600">No rigs found</div>
      )}

      {/* Add Rig dialog */}
      {addDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6 w-full max-w-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-100">Add Rig</h3>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Git URL or local path</label>
              <input
                type="text"
                value={addPath}
                onChange={(e) => setAddPath(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddRig(); }}
                placeholder="/Users/abhik/repos/myproject"
                autoFocus
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[10px] text-zinc-500 mt-1">This may take a while for remote repos.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setAddDialogOpen(false); setAddPath(""); }}
                className="rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRig}
                disabled={!addPath.trim() || adding}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-800 hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
              >
                {adding ? "Adding\u2026" : "Add Rig"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Rig confirmation dialog */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6 w-full max-w-sm space-y-4">
            <h3 className="text-sm font-semibold text-red-400">Remove Rig</h3>
            <p className="text-xs text-zinc-400">
              This will force-remove <span className="text-zinc-100 font-medium">{removeTarget}</span> and kill all sessions. Type the rig name to confirm:
            </p>
            <input
              type="text"
              value={removeConfirmName}
              onChange={(e) => setRemoveConfirmName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRemoveRig(); }}
              placeholder={removeTarget}
              autoFocus
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setRemoveTarget(null); setRemoveConfirmName(""); }}
                className="rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveRig}
                disabled={removeConfirmName !== removeTarget || removing}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-red-400 border border-red-900 hover:bg-red-900/50 transition-colors disabled:opacity-50"
              >
                {removing ? "Removing\u2026" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
