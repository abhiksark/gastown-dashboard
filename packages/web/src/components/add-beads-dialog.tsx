import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Bead } from "@/lib/types";

interface AddBeadsDialogProps {
  open: boolean;
  convoyId: string;
  existingBeadIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

export function AddBeadsDialog({ open, convoyId, existingBeadIds, onClose, onAdded }: AddBeadsDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();
  const { data: beads } = useFetch<Bead[]>("/beads?status=open", 15000);

  if (!open) return null;

  const available = (beads || []).filter((b) => !existingBeadIds.includes(b.id));

  function toggleBead(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      addToast("Select at least one bead", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost(`/convoys/${encodeURIComponent(convoyId)}/add`, {
        beads: Array.from(selected),
      });
      addToast(`Added ${selected.size} bead(s) to convoy`, "success");
      setSelected(new Set());
      onAdded();
      onClose();
    } catch (err: any) {
      addToast(`Failed: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">
          Add Beads to {convoyId}
        </h2>

        <div className="max-h-64 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
          {available.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-600">No available beads to add</p>
          ) : (
            available.map((bead) => (
              <label
                key={bead.id}
                className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-800/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(bead.id)}
                  onChange={() => toggleBead(bead.id)}
                  className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-0"
                />
                <span className="font-mono text-zinc-500 shrink-0">{bead.id}</span>
                <span className="text-zinc-300 truncate">{bead.title}</span>
              </label>
            ))
          )}
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
            disabled={submitting || selected.size === 0}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {submitting ? "Adding..." : `Add ${selected.size} Bead(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
