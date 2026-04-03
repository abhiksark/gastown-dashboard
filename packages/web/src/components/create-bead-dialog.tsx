import { useState } from "react";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface CreateBeadDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateBeadDialog({ open, onClose, onCreated }: CreateBeadDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(2);
  const [assignee, setAssignee] = useState("");
  const [labels, setLabels] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  if (!open) return null;

  async function handleSubmit() {
    if (!title.trim()) {
      addToast("Title is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/actions/beads/create", {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignee: assignee.trim() || undefined,
        labels: labels.trim() || undefined,
      });
      addToast("Bead created", "success");
      setTitle("");
      setDescription("");
      setPriority(2);
      setAssignee("");
      setLabels("");
      onCreated();
      onClose();
    } catch (err: any) {
      addToast(`Failed to create bead: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">Create Bead</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bead title"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
              >
                <option value={0}>P0 — Critical</option>
                <option value={1}>P1 — High</option>
                <option value={2}>P2 — Normal</option>
                <option value={3}>P3 — Low</option>
                <option value={4}>P4 — Backlog</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Assignee</label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Labels</label>
            <input
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="Comma-separated (e.g. bug,urgent)"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
            />
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
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
