import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Agent, Rig } from "@/lib/types";

interface AssignDialogProps {
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignDialog({ open, onClose, onAssigned }: AssignDialogProps) {
  const { data: agents } = useFetch<Agent[]>("/agents", 30000);
  const { data: rigs } = useFetch<Rig[]>("/rigs", 30000);

  const [crew, setCrew] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(2);
  const [rig, setRig] = useState("");
  const [labels, setLabels] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  if (!open) return null;

  const crewAgents = (agents || []).filter((a) => a.role === "crew");

  async function handleSubmit() {
    if (!crew || !title.trim()) {
      addToast("Crew and title are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/actions/assign", {
        crew,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        rig: rig || undefined,
        labels: labels.trim() || undefined,
      });
      addToast(`Assigned to ${crew}`, "success");
      setTitle("");
      setDescription("");
      setPriority(2);
      setCrew("");
      setRig("");
      setLabels("");
      onAssigned();
      onClose();
    } catch (err: any) {
      addToast(`Failed to assign: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">Assign Work</h2>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Crew Member</label>
              <select
                value={crew}
                onChange={(e) => setCrew(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
              >
                <option value="">Select crew...</option>
                {crewAgents.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}{a.rig ? ` (${a.rig})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Rig</label>
              <select
                value={rig}
                onChange={(e) => setRig(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
              >
                <option value="">Auto-detect</option>
                {(rigs || []).map((r) => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
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
              <label className="text-xs text-zinc-500 mb-1 block">Labels</label>
              <input
                type="text"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                placeholder="Comma-separated"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
              />
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
            {submitting ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
