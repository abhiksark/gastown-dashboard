import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Bead } from "@/lib/types";

interface CreateConvoyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type MergeStrategy = "direct" | "mr" | "local";

export function CreateConvoyDialog({ open, onClose, onCreated }: CreateConvoyDialogProps) {
  const [title, setTitle] = useState("");
  const [selectedBeads, setSelectedBeads] = useState<Set<string>>(new Set());
  const [merge, setMerge] = useState<MergeStrategy>("mr");
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();
  const { data: beads } = useFetch<Bead[]>("/beads?status=open", 15000);

  if (!open) return null;

  function toggleBead(id: string) {
    setSelectedBeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!title.trim()) {
      addToast("Title is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/convoys/create", {
        title: title.trim(),
        beads: Array.from(selectedBeads),
        merge,
      });
      addToast("Convoy created", "success");
      setTitle("");
      setSelectedBeads(new Set());
      setMerge("mr");
      onCreated();
      onClose();
    } catch (err: any) {
      addToast(`Failed to create convoy: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">Create Convoy</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Convoy title"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">
              Beads ({selectedBeads.size} selected)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
              {!beads || beads.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-600">No open beads</p>
              ) : (
                beads.map((bead) => (
                  <label
                    key={bead.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBeads.has(bead.id)}
                      onChange={() => toggleBead(bead.id)}
                      className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-0"
                    />
                    <span className="font-mono text-zinc-500 shrink-0">{bead.id}</span>
                    <span className="text-zinc-300 truncate">{bead.title}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Merge Strategy</label>
            <div className="flex gap-2">
              {(["direct", "mr", "local"] as MergeStrategy[]).map((s) => (
                <label
                  key={s}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                    merge === s
                      ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                      : "border-[var(--color-border)] text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="merge"
                    value={s}
                    checked={merge === s}
                    onChange={() => setMerge(s)}
                    className="sr-only"
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Convoy"}
          </button>
        </div>
      </div>
    </div>
  );
}
