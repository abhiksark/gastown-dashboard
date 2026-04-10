import { useState } from "react";
import { apiPost } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { useToast } from "@/hooks/use-toast";
import type { MailAddress, Rig } from "@/lib/types";

interface ComposeDialogProps {
  open: boolean;
  onClose: () => void;
  addresses: MailAddress[];
  onSent: () => void;
}

export function ComposeDialog({
  open,
  onClose,
  addresses,
  onSent,
}: ComposeDialogProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: rigs } = useFetch<Rig[]>("/rigs", 30000);
  const { addToast } = useToast();

  if (!open) return null;

  const isBroadcast = to.startsWith("@") || to.endsWith("/");

  async function handleSend() {
    if (!to || (!isBroadcast && (!subject || !body))) {
      setError("All fields are required");
      return;
    }
    setSending(true);
    setError(null);
    try {
      if (isBroadcast) {
        const broadcastBody: { message: string; rig?: string; all?: boolean } = {
          message: body || subject,
        };
        if (to === "@all") broadcastBody.all = true;
        else if (to.endsWith("/")) broadcastBody.rig = to.slice(0, -1);
        await apiPost("/town/broadcast", broadcastBody);
        addToast("Broadcast sent", "success");
      } else {
        await apiPost("/mail/send", { to, subject, body });
      }
      setTo("");
      setSubject("");
      setBody("");
      onSent();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">
          Compose Message
        </h2>

        <div className="space-y-3">
          {/* To */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">To</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
            >
              <option value="">Select recipient...</option>
              <optgroup label="Broadcast">
                <option value="@all">@all (all agents)</option>
                <option value="@workers">@workers (polecats + crew)</option>
                {(rigs || []).map((r) => (
                  <option key={`${r.name}/`} value={`${r.name}/`}>
                    {r.name}/ (all in rig)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Direct">
                {addresses.map((addr) => (
                  <option key={addr.address} value={addr.address}>
                    {addr.address} ({addr.type})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message body..."
              rows={5}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
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
            onClick={handleSend}
            disabled={sending}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
