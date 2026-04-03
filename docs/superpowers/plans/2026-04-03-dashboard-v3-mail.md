# Dashboard v3: Mail Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Mail page to the Gas Town Dashboard — a minimal email client scoped to Gas Town agent addresses with inbox browsing, message reading, compose, archive, and mark-read.

**Architecture:** One new backend route file wrapping `gt mail` CLI commands (inbox, read, send, archive, mark-read, directory, search). One new React page with a split-pane layout (address switcher + message list on left, message detail on right) and a compose modal dialog.

**Tech Stack:** Same as v1/v2 — React 18, TypeScript, Tailwind CSS v4, Express 5, Lucide icons. Uses shadcn/ui dialog component for compose modal.

**Codebase:** `/Users/abhiksarkar/Documents/Projects/personal/gastown-dashboard`

---

## File Structure

```
Changes to existing files:
  packages/server/src/index.ts                    — register mail route
  packages/web/src/lib/types.ts                   — add MailMessage, MailAddress interfaces
  packages/web/src/components/layout/sidebar.tsx   — add Mail nav item
  packages/web/src/App.tsx                         — add /mail route

New files:
  packages/server/src/routes/mail.ts               — all mail API endpoints
  packages/web/src/pages/mail.tsx                   — mail page with split pane layout
  packages/web/src/components/compose-dialog.tsx    — compose message modal
```

---

## Task 1: TypeScript Types

**Files:**
- Modify: `packages/web/src/lib/types.ts`

- [ ] **Step 1: Add MailMessage and MailAddress interfaces**

Append to the end of `packages/web/src/lib/types.ts`:

```ts
// From `gt mail inbox <address> --json`
export interface MailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  type: string;
  priority: number;
  status: string;
  created_at: string;
  read: boolean;
  reply_to: string | null;
}

// From `gt mail directory`
export interface MailAddress {
  address: string;
  type: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/lib/types.ts
git commit -m "feat: add MailMessage and MailAddress TypeScript interfaces"
```

---

## Task 2: Backend — Mail Route

**Files:**
- Create: `packages/server/src/routes/mail.ts`

- [ ] **Step 1: Create packages/server/src/routes/mail.ts**

```ts
import { Router } from "express";
import { runCli, runAction } from "../cli.js";

const router = Router();

// GET /api/mail/directory — list all valid mail addresses
router.get("/directory", async (_req, res) => {
  try {
    const raw = await runCli("gt", ["mail", "directory", "--json"]);
    res.json(Array.isArray(raw) ? raw : []);
  } catch (err: any) {
    // directory may not support --json, parse text output
    try {
      const text = await runCli("gt", ["mail", "directory"]);
      if (typeof text !== "string") {
        res.json([]);
        return;
      }
      const lines = text.split("\n").filter((l: string) => l.trim() && !l.startsWith("ADDRESS"));
      const addresses = lines.map((line: string) => {
        const parts = line.trim().split(/\s+/);
        return { address: parts[0], type: parts[1] || "unknown" };
      });
      res.json(addresses);
    } catch {
      res.json([]);
    }
  }
});

// GET /api/mail/inbox?address=mayor/&unread=true — get inbox for an address
router.get("/inbox", async (req, res) => {
  try {
    const address = (req.query.address as string) || "mayor/";
    const args = ["mail", "inbox", address, "--json"];
    if (req.query.unread === "true") {
      args.push("--unread");
    } else {
      args.push("--all");
    }
    const data = await runCli("gt", args);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mail/read/:id — read a specific message
router.get("/read/:id", async (req, res) => {
  try {
    const data = await runCli("gt", ["mail", "read", req.params.id, "--json"]);
    res.json(data ?? null);
  } catch (err: any) {
    // mail read may not support --json, try without
    try {
      const text = await runCli("gt", ["mail", "read", req.params.id]);
      res.json({ id: req.params.id, body: text });
    } catch (innerErr: any) {
      res.status(500).json({ error: innerErr.message });
    }
  }
});

// GET /api/mail/search?q=pattern&from=sender — search messages
router.get("/search", async (req, res) => {
  try {
    const query = (req.query.q as string) || ".*";
    const args = ["mail", "search", query, "--json"];
    if (req.query.from) {
      args.push("--from", req.query.from as string);
    }
    if (req.query.archive === "true") {
      args.push("--archive");
    }
    const data = await runCli("gt", args);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mail/send — send a message
router.post("/send", async (req, res) => {
  try {
    const { to, subject, body, type, priority } = req.body;
    if (!to || !subject || !body) {
      res.status(400).json({ error: "to, subject, and body are required" });
      return;
    }
    const args = ["mail", "send", to, "-s", subject, "-m", body];
    if (type && type !== "notification") {
      args.push("--type", type);
    }
    if (priority !== undefined && priority !== 2) {
      args.push("--priority", String(priority));
    }
    const result = await runAction("gt", args);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mail/archive/:id — archive a message
router.post("/archive/:id", async (req, res) => {
  try {
    const result = await runAction("gt", ["mail", "archive", req.params.id]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mail/mark-read/:id — mark message as read
router.post("/mark-read/:id", async (req, res) => {
  try {
    const result = await runAction("gt", ["mail", "mark-read", req.params.id]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/routes/mail.ts
git commit -m "feat(server): add mail API route with inbox, read, send, archive, mark-read, search"
```

---

## Task 3: Register Mail Route in Express

**Files:**
- Modify: `packages/server/src/index.ts`

- [ ] **Step 1: Add import**

In `packages/server/src/index.ts`, add after the escalations import (line 9):

```ts
import mailRoutes from "./routes/mail.js";
```

- [ ] **Step 2: Add route registration**

After `app.use("/api/escalations", escalationsRoutes);` (line 27), add:

```ts
app.use("/api/mail", mailRoutes);
```

- [ ] **Step 3: Test endpoints**

Start server, then:

```bash
curl -s http://localhost:4800/api/mail/directory
curl -s http://localhost:4800/api/mail/inbox?address=mayor/
```

Expected: Directory returns array of addresses. Inbox returns `[]` (empty).

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/index.ts
git commit -m "feat(server): register mail route"
```

---

## Task 4: Install shadcn/ui Dialog Component

**Files:**
- Creates files in: `packages/web/src/components/ui/`

- [ ] **Step 1: Install dialog component**

Run from `packages/web/`:

```bash
npx shadcn@latest add dialog --yes
```

If the CLI fails, manually install:

```bash
pnpm add @radix-ui/react-dialog
```

And create `packages/web/src/components/ui/dialog.tsx` with the shadcn dialog component code from the registry.

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/ui/
git commit -m "feat(web): add shadcn/ui dialog component"
```

---

## Task 5: Compose Dialog Component

**Files:**
- Create: `packages/web/src/components/compose-dialog.tsx`

- [ ] **Step 1: Create packages/web/src/components/compose-dialog.tsx**

```tsx
import { useState } from "react";
import { apiPost } from "@/lib/api";
import type { MailAddress } from "@/lib/types";

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

  if (!open) return null;

  async function handleSend() {
    if (!to || !subject || !body) {
      setError("All fields are required");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiPost("/mail/send", { to, subject, body });
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
              {addresses.map((addr) => (
                <option key={addr.address} value={addr.address}>
                  {addr.address} ({addr.type})
                </option>
              ))}
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/compose-dialog.tsx
git commit -m "feat(web): add compose message dialog component"
```

---

## Task 6: Mail Page

**Files:**
- Create: `packages/web/src/pages/mail.tsx`

- [ ] **Step 1: Create packages/web/src/pages/mail.tsx**

```tsx
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
        <h2 className="text-lg font-semibold text-zinc-100">Mail</h2>
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
                  <div key={i} className="h-16 rounded bg-zinc-900 animate-pulse" />
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/pages/mail.tsx
git commit -m "feat(web): add mail page with split-pane inbox, message detail, and compose"
```

---

## Task 7: Wire Up Frontend — Sidebar + Router

**Files:**
- Modify: `packages/web/src/components/layout/sidebar.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Update sidebar.tsx — add Mail nav item**

In `packages/web/src/components/layout/sidebar.tsx`, update the import line. Replace:

```tsx
import { LayoutDashboard, Users, CircleDot, Server, Truck, GitMerge, AlertTriangle, PanelLeftClose, PanelLeft } from "lucide-react";
```

With:

```tsx
import { LayoutDashboard, Users, CircleDot, Server, Truck, GitMerge, AlertTriangle, Mail, PanelLeftClose, PanelLeft } from "lucide-react";
```

Then add a new entry to the `navItems` array after the `escalations` entry:

```tsx
  { to: "/mail", label: "Mail", icon: Mail },
```

The full array should be:

```tsx
const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/agents", label: "Agents", icon: Users },
  { to: "/beads", label: "Beads", icon: CircleDot },
  { to: "/rigs", label: "Rigs", icon: Server },
  { to: "/convoys", label: "Convoys", icon: Truck },
  { to: "/refinery", label: "Refinery", icon: GitMerge },
  { to: "/escalations", label: "Escalations", icon: AlertTriangle },
  { to: "/mail", label: "Mail", icon: Mail },
];
```

- [ ] **Step 2: Update App.tsx — add route and import**

In `packages/web/src/App.tsx`, add import after the escalations import:

```tsx
import { MailPage } from "@/pages/mail";
```

Add route after the escalations route:

```tsx
<Route path="/mail" element={<MailPage />} />
```

- [ ] **Step 3: Verify TypeScript compiles**

Run from `packages/web/`:

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/layout/sidebar.tsx packages/web/src/App.tsx
git commit -m "feat(web): wire up mail page in sidebar and router"
```

---

## Task 8: Verification

- [ ] **Step 1: Start the full stack**

```bash
pnpm dev
```

- [ ] **Step 2: Test mail API endpoints**

```bash
curl -s http://localhost:4800/api/mail/directory
curl -s http://localhost:4800/api/mail/inbox?address=mayor/
```

Expected: Directory returns addresses (mayor/, deacon/, @crew, @overseer, etc.). Inbox returns `[]` or messages.

- [ ] **Step 3: Verify mail page in browser**

Open `http://localhost:5173/mail` and verify:

1. Address dropdown populated with Gas Town addresses
2. Message list shows "No messages" empty state (or messages if any exist)
3. Clicking "Compose" opens modal with To dropdown, Subject, Body fields
4. Sidebar shows Mail item, highlights correctly

- [ ] **Step 4: Test compose (if comfortable sending a test message)**

Click Compose, select "mayor/" as recipient, enter a subject and body, click Send. Then switch to the mayor/ inbox and verify the message appears.

- [ ] **Step 5: Verify all existing pages still work**

Click through Overview, Agents, Beads, Rigs, Convoys, Refinery, Escalations — all should load without errors.

---

## Summary

| Task | What it builds | Key files |
|------|---------------|-----------|
| 1 | TypeScript interfaces | types.ts |
| 2 | Mail API route (6 endpoints) | routes/mail.ts |
| 3 | Register route in Express | index.ts |
| 4 | shadcn/ui dialog install | components/ui/dialog.tsx |
| 5 | Compose dialog component | compose-dialog.tsx |
| 6 | Mail page (split pane) | pages/mail.tsx |
| 7 | Wire up sidebar + router | sidebar.tsx, App.tsx |
| 8 | End-to-end verification | Manual walkthrough |

8 tasks. Each produces a working commit. After Task 3 the backend is complete. After Task 7 the full mail client is wired up.
