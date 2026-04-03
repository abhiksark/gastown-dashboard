import { useState, useEffect, useCallback } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import { ComposeDialog } from "@/components/compose-dialog";
import { apiFetch, apiPost } from "@/lib/api";
import type { MailMessage, MailAddress } from "@/lib/types";
import { Mail, Plus, Archive, CheckCheck } from "lucide-react";

export function MailPage() {
  const { data: addresses } = useFetch<MailAddress[]>("/mail/directory", 60000);

  const [selectedAddress, setSelectedAddress] = useState("mayor/");
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<MailMessage[]>(
        `/mail/inbox?address=${encodeURIComponent(selectedAddress)}`
      );
      setMessages(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAddress]);

  useEffect(() => {
    fetchInbox();
    const id = setInterval(fetchInbox, 10000);
    return () => clearInterval(id);
  }, [fetchInbox]);

  async function handleArchive(msgId: string) {
    setActing(msgId);
    try {
      await apiPost(`/mail/archive/${msgId}`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      if (selectedMessage?.id === msgId) setSelectedMessage(null);
    } catch {
      // archive may fail
    } finally {
      setActing(null);
    }
  }

  async function handleMarkRead(msgId: string) {
    setActing(msgId);
    try {
      await apiPost(`/mail/mark-read/${msgId}`);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, read: true } : m))
      );
    } catch {
      // mark-read may fail
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Mail</h2>
        <div className="flex items-center gap-3">
          {/* Address switcher */}
          <select
            value={selectedAddress}
            onChange={(e) => {
              setSelectedAddress(e.target.value);
              setSelectedMessage(null);
            }}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500"
          >
            {(addresses || []).map((addr) => (
              <option key={addr.address} value={addr.address}>
                {addr.address}
              </option>
            ))}
          </select>

          {/* Compose button */}
          <button
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs text-white hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Compose
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-sm">Failed to load mail: {error}</div>
      )}

      {/* Split pane */}
      <div className="flex gap-4" style={{ height: "calc(100vh - 200px)" }}>
        {/* Message list (left) */}
        <div className="w-96 shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="text-xs text-zinc-500">
              {messages.length} message{messages.length !== 1 ? "s" : ""} in {selectedAddress}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-1 p-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 rounded skeleton" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                <Mail className="h-8 w-8 mb-2" />
                <p className="text-xs">No messages</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedMessage?.id === msg.id
                        ? "bg-zinc-800"
                        : "hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs truncate max-w-[200px] ${msg.read ? "text-zinc-500" : "text-zinc-200 font-medium"}`}>
                        {msg.from}
                      </span>
                      <span className="text-[10px] text-zinc-600 shrink-0 ml-2">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${msg.read ? "text-zinc-500" : "text-zinc-200"}`}>
                      {msg.subject}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {!msg.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                      )}
                      <StatusBadge status={msg.type} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message detail (right) */}
        <div className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col">
          {selectedMessage ? (
            <>
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {selectedMessage.subject}
                    </h3>
                    <div className="flex gap-3 mt-1.5 text-xs text-zinc-500">
                      <span>From: {selectedMessage.from}</span>
                      <span>To: {selectedMessage.to}</span>
                      <span>
                        {new Date(selectedMessage.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-4">
                    <StatusBadge status={selectedMessage.type} />
                    {selectedMessage.priority < 2 && (
                      <StatusBadge
                        status={selectedMessage.priority === 0 ? "critical" : "high"}
                      />
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  {!selectedMessage.read && (
                    <button
                      onClick={() => handleMarkRead(selectedMessage.id)}
                      disabled={acting === selectedMessage.id}
                      className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors disabled:opacity-50"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => handleArchive(selectedMessage.id)}
                    disabled={acting === selectedMessage.id}
                    className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors disabled:opacity-50"
                  >
                    <Archive className="h-3 w-3" />
                    Archive
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {selectedMessage.body}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600">
              <div className="text-center">
                <Mail className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm">Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      <ComposeDialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        addresses={addresses || []}
        onSent={fetchInbox}
      />
    </div>
  );
}
