import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Bead, Rig, Agent } from "@/lib/types";

interface SlingDialogProps {
  open: boolean;
  onClose: () => void;
  preselectedBead?: string;
}

export function SlingDialog({ open, onClose, preselectedBead }: SlingDialogProps) {
  const { data: beads } = useFetch<Bead[]>("/beads", 30000);
  const { data: rigs } = useFetch<Rig[]>("/rigs", 30000);
  const { data: agents } = useFetch<Agent[]>("/agents", 30000);

  const [beadId, setBeadId] = useState(preselectedBead || "");
  const [target, setTarget] = useState("");
  const [merge, setMerge] = useState("mr");
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  if (!open) return null;

  const openBeads = (beads || []).filter((b) => b.status === "open");

  // Build target options: rigs first, then agents
  const targets: { label: string; value: string; group: string }[] = [];
  for (const rig of rigs || []) {
    targets.push({ label: rig.name, value: rig.name, group: "Rigs" });
  }
  for (const agent of agents || []) {
    const agentTarget = agent.rig ? `${agent.rig}/${agent.name}` : agent.name;
    targets.push({ label: `${agent.name} (${agent.role})`, value: agentTarget, group: "Agents" });
  }

  async function handleSubmit() {
    if (!beadId || !target) {
      addToast("Bead and target are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/actions/sling", { beadId, target, merge });
      addToast(`Slung ${beadId} to ${target}`, "success");
      setBeadId("");
      setTarget("");
      onClose();
    } catch (err: any) {
      addToast(`Failed to sling: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">Sling Work</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Bead</label>
            <select
              value={beadId}
              onChange={(e) => setBeadId(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
            >
              <option value="">Select bead...</option>
              {openBeads.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} — {b.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Target</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
            >
              <option value="">Select target...</option>
              {(rigs || []).length > 0 && (
                <optgroup label="Rigs">
                  {(rigs || []).map((r) => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </optgroup>
              )}
              {(agents || []).length > 0 && (
                <optgroup label="Agents">
                  {(agents || []).map((a) => {
                    const val = a.rig ? `${a.rig}/${a.name}` : a.name;
                    return (
                      <option key={val} value={val}>
                        {a.name} ({a.role}){a.rig ? ` — ${a.rig}` : ""}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Merge Strategy</label>
            <div className="flex gap-3">
              {(["mr", "direct", "local"] as const).map((strategy) => (
                <label key={strategy} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="merge"
                    value={strategy}
                    checked={merge === strategy}
                    onChange={() => setMerge(strategy)}
                    className="accent-blue-500"
                  />
                  <span className="text-xs text-zinc-300">{strategy}</span>
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
            {submitting ? "Slinging..." : "Sling"}
          </button>
        </div>
      </div>
    </div>
  );
}
