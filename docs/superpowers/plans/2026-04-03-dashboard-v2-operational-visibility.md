# Dashboard v2: Operational Visibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Convoys, Refinery, and Escalations pages to the Gas Town Dashboard, plus new backend routes and updated navigation — giving full visibility into work batches, merge queues, and critical issues.

**Architecture:** Three new backend route files wrapping `gt convoy`, `gt mq`, and `gt escalate` CLI commands. Three new React page components following the existing page pattern (useFetch hook, StatusBadge, loading skeletons, error states). Updated sidebar navigation and types.

**Tech Stack:** Same as v1 — React 18, TypeScript, Tailwind CSS v4, Express 5, Lucide icons.

**Codebase:** `/Users/abhiksarkar/Documents/Projects/personal/gastown-dashboard`

---

## File Structure

```
Changes to existing files:
  packages/server/src/index.ts          — register 3 new route files
  packages/web/src/lib/types.ts         — add Convoy, MergeRequest, Escalation interfaces
  packages/web/src/components/layout/sidebar.tsx — add 3 nav items
  packages/web/src/components/status-badge.tsx   — add new status variants
  packages/web/src/App.tsx              — add 3 new routes

New files:
  packages/server/src/routes/convoys.ts     — GET /api/convoys, GET /api/convoys/:id
  packages/server/src/routes/refinery.ts    — GET /api/refinery/:rig
  packages/server/src/routes/escalations.ts — GET /api/escalations, POST ack/close
  packages/web/src/pages/convoys.tsx        — convoy kanban/list page
  packages/web/src/pages/refinery.tsx       — merge queue page
  packages/web/src/pages/escalations.tsx    — escalation list page
```

---

## Task 1: TypeScript Types

**Files:**
- Modify: `packages/web/src/lib/types.ts`

- [ ] **Step 1: Add Convoy, MergeRequest, and Escalation interfaces**

Append to the end of `packages/web/src/lib/types.ts`:

```ts
// From `gt convoy list --json` / `gt convoy show :id --json`
export interface Convoy {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  owner: string;
  beads: ConvoyBead[] | null;
  total: number;
  done: number;
  active: number;
  blocked: number;
  pending: number;
}

export interface ConvoyBead {
  id: string;
  title: string;
  status: string;
  assignee: string;
  rig: string;
}

// From `gt mq list :rig --json`
export interface MergeRequest {
  id: string;
  status: string;
  priority: number;
  branch: string;
  worker: string;
  age: string;
  rig: string;
}

// From `gt escalate list --json`
export interface Escalation {
  id: string;
  description: string;
  severity: string;
  status: string;
  source_agent: string;
  rig: string;
  created_at: string;
  acknowledged_at: string | null;
  closed_at: string | null;
  reason: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/lib/types.ts
git commit -m "feat: add Convoy, MergeRequest, Escalation TypeScript interfaces"
```

---

## Task 2: Backend — Convoys Route

**Files:**
- Create: `packages/server/src/routes/convoys.ts`

- [ ] **Step 1: Create packages/server/src/routes/convoys.ts**

```ts
import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

// GET /api/convoys — list all convoys
router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["convoy", "list", "--json"]);
    // gt convoy list --json returns null when empty, or an array
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/convoys/:id — show convoy detail
router.get("/:id", async (req, res) => {
  try {
    const data = await runCli("gt", ["convoy", "show", req.params.id, "--json"]);
    res.json(data ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/routes/convoys.ts
git commit -m "feat(server): add convoys API route"
```

---

## Task 3: Backend — Refinery Route

**Files:**
- Create: `packages/server/src/routes/refinery.ts`

- [ ] **Step 1: Create packages/server/src/routes/refinery.ts**

```ts
import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

// GET /api/refinery/:rig — merge queue for a specific rig
router.get("/:rig", async (req, res) => {
  try {
    const data = await runCli("gt", ["mq", "list", req.params.rig, "--json"]);
    // gt mq list returns null when empty
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/refinery — merge queues for ALL rigs
router.get("/", async (_req, res) => {
  try {
    // First get the list of rigs, then fetch MQ for each
    const rigsRaw = await runCli("gt", ["rig", "list", "--json"]);
    const rigs = Array.isArray(rigsRaw) ? rigsRaw : [];
    const results: Record<string, unknown[]> = {};
    for (const rig of rigs) {
      try {
        const data = await runCli("gt", ["mq", "list", rig.name, "--json"]);
        results[rig.name] = Array.isArray(data) ? data : [];
      } catch {
        results[rig.name] = [];
      }
    }
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/routes/refinery.ts
git commit -m "feat(server): add refinery merge queue API route"
```

---

## Task 4: Backend — Escalations Route

**Files:**
- Create: `packages/server/src/routes/escalations.ts`

- [ ] **Step 1: Create packages/server/src/routes/escalations.ts**

```ts
import { Router } from "express";
import { runCli, runAction } from "../cli.js";

const router = Router();

// GET /api/escalations — list all escalations (including closed)
router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["escalate", "list", "--all", "--json"]);
    // gt escalate list --json returns null when empty
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/escalations/:id/ack — acknowledge an escalation
router.post("/:id/ack", async (req, res) => {
  try {
    const result = await runAction("gt", ["escalate", "ack", req.params.id]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/escalations/:id/close — close an escalation
router.post("/:id/close", async (req, res) => {
  try {
    const reason = req.body.reason || "Closed from dashboard";
    const result = await runAction("gt", [
      "escalate", "close", req.params.id, "--reason", reason,
    ]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/routes/escalations.ts
git commit -m "feat(server): add escalations API route with ack/close actions"
```

---

## Task 5: Register New Routes in Express

**Files:**
- Modify: `packages/server/src/index.ts`

- [ ] **Step 1: Add imports and route registration**

Replace the entire file `packages/server/src/index.ts` with:

```ts
import express from "express";
import cors from "cors";
import overviewRoutes from "./routes/overview.js";
import rigsRoutes from "./routes/rigs.js";
import agentsRoutes from "./routes/agents.js";
import beadsRoutes from "./routes/beads.js";
import convoysRoutes from "./routes/convoys.js";
import refineryRoutes from "./routes/refinery.js";
import escalationsRoutes from "./routes/escalations.js";
import feedRoutes from "./feed.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

app.use("/api/overview", overviewRoutes);
app.use("/api/rigs", rigsRoutes);
app.use("/api/agents", agentsRoutes);
app.use("/api/beads", beadsRoutes);
app.use("/api/convoys", convoysRoutes);
app.use("/api/refinery", refineryRoutes);
app.use("/api/escalations", escalationsRoutes);
app.use("/api/feed", feedRoutes);

const PORT = process.env.PORT || 4800;
app.listen(PORT, () => {
  console.log(`[gastown-server] listening on :${PORT}`);
});
```

- [ ] **Step 2: Test new endpoints**

Start server, then run:

```bash
curl -s http://localhost:4800/api/convoys
curl -s http://localhost:4800/api/refinery
curl -s http://localhost:4800/api/refinery/abhik_portfolio
curl -s http://localhost:4800/api/escalations
```

Expected: Each returns `[]` (empty arrays, since no convoys/MRs/escalations exist yet). No 500 errors.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/index.ts
git commit -m "feat(server): register convoy, refinery, and escalation routes"
```

---

## Task 6: Status Badge — New Variants

**Files:**
- Modify: `packages/web/src/components/status-badge.tsx`

- [ ] **Step 1: Add new status variants**

In `packages/web/src/components/status-badge.tsx`, add these entries to the `variants` object (after the existing `polecat` entry, before the closing `};`):

```ts
  ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  closed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  acknowledged: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/status-badge.tsx
git commit -m "feat(web): add status badge variants for convoys, refinery, escalations"
```

---

## Task 7: Convoys Page

**Files:**
- Create: `packages/web/src/pages/convoys.tsx`

- [ ] **Step 1: Create packages/web/src/pages/convoys.tsx**

```tsx
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { Convoy } from "@/lib/types";
import { Truck } from "lucide-react";

export function ConvoysPage() {
  const { data, loading, error } = useFetch<Convoy[]>("/convoys", 10000);

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load convoys: {error}</div>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Convoys</h2>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-[var(--color-card)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">Convoys</h2>

      {!data || data.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <Truck className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No active convoys</p>
          <p className="text-zinc-600 text-xs mt-1">
            Create one with: gt convoy create "title" --beads bead-1,bead-2
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {data.map((convoy) => {
            const total = convoy.total || 0;
            const done = convoy.done || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
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

                {/* Bead list (if available) */}
                {convoy.beads && convoy.beads.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-1.5">
                    {convoy.beads.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-zinc-400 truncate max-w-[60%]">
                          {b.title}
                        </span>
                        <StatusBadge status={b.status} />
                      </div>
                    ))}
                  </div>
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
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/pages/convoys.tsx
git commit -m "feat(web): add convoys page with progress bars and bead lists"
```

---

## Task 8: Refinery Page

**Files:**
- Create: `packages/web/src/pages/refinery.tsx`

- [ ] **Step 1: Create packages/web/src/pages/refinery.tsx**

```tsx
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { Rig } from "@/lib/types";
import { GitMerge } from "lucide-react";

interface MergeRequest {
  id: string;
  status: string;
  priority: number;
  branch: string;
  worker: string;
  age: string;
}

export function RefineryPage() {
  const { data: rigs, loading: rigsLoading } = useFetch<Rig[]>("/rigs", 10000);
  const { data: queues, loading: queuesLoading, error } = useFetch<
    Record<string, MergeRequest[]>
  >("/refinery", 10000);

  const loading = rigsLoading || queuesLoading;

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load refinery: {error}</div>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Refinery</h2>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-[var(--color-card)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const rigNames = rigs ? rigs.map((r) => r.name) : [];
  const hasAnyMRs = queues
    ? Object.values(queues).some((q) => q.length > 0)
    : false;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">Refinery</h2>

      {!hasAnyMRs ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <GitMerge className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">All merge queues empty</p>
          <p className="text-zinc-600 text-xs mt-1">
            Merge requests appear here when polecats submit work via gt done
          </p>
        </div>
      ) : null}

      {rigNames.map((rigName) => {
        const mrs = queues?.[rigName] || [];
        const rig = rigs?.find((r) => r.name === rigName);

        return (
          <div
            key={rigName}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-zinc-200">
                  {rigName}
                </h3>
                <span className="text-xs text-zinc-500">
                  {mrs.length} merge request{mrs.length !== 1 ? "s" : ""}
                </span>
              </div>
              {rig && <StatusBadge status={rig.refinery} />}
            </div>

            {mrs.length === 0 ? (
              <div className="px-4 py-6 text-center text-zinc-600 text-xs">
                Queue empty
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      ID
                    </th>
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      Status
                    </th>
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      Priority
                    </th>
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      Branch
                    </th>
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      Worker
                    </th>
                    <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                      Age
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mrs.map((mr) => (
                    <tr
                      key={mr.id}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors"
                    >
                      <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                        {mr.id}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={mr.status} />
                      </td>
                      <td className="px-4 py-2 text-zinc-400 tabular-nums text-xs">
                        P{mr.priority}
                      </td>
                      <td className="px-4 py-2 text-zinc-400 font-mono text-xs truncate max-w-[200px]">
                        {mr.branch}
                      </td>
                      <td className="px-4 py-2 text-zinc-400 text-xs">
                        {mr.worker}
                      </td>
                      <td className="px-4 py-2 text-zinc-500 text-xs">
                        {mr.age}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/pages/refinery.tsx
git commit -m "feat(web): add refinery page with per-rig merge queue tables"
```

---

## Task 9: Escalations Page

**Files:**
- Create: `packages/web/src/pages/escalations.tsx`

- [ ] **Step 1: Create packages/web/src/pages/escalations.tsx**

```tsx
import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import { apiPost } from "@/lib/api";
import type { Escalation } from "@/lib/types";
import { AlertTriangle, CheckCircle } from "lucide-react";

export function EscalationsPage() {
  const { data, loading, error, refetch } = useFetch<Escalation[]>(
    "/escalations",
    10000
  );
  const [acting, setActing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const statuses = ["all", "open", "acknowledged", "resolved", "closed"];

  const filtered = data
    ? statusFilter === "all"
      ? data
      : data.filter((e) => e.status === statusFilter)
    : [];

  // Sort: open first, then by severity (critical > high > medium > low)
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const sorted = [...filtered].sort((a, b) => {
    // Open before closed
    if (a.status === "open" && b.status !== "open") return -1;
    if (a.status !== "open" && b.status === "open") return 1;
    // Then by severity
    return (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
  });

  async function handleAck(id: string) {
    setActing(id);
    try {
      await apiPost(`/escalations/${id}/ack`);
      refetch();
    } catch {
      // ack may fail if already acknowledged
    } finally {
      setActing(null);
    }
  }

  async function handleClose(id: string) {
    setActing(id);
    try {
      await apiPost(`/escalations/${id}/close`, {
        reason: "Resolved from dashboard",
      });
      refetch();
    } catch {
      // close may fail
    } finally {
      setActing(null);
    }
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load escalations: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Escalations</h2>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-[var(--color-card)] animate-pulse"
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-800 mx-auto mb-3" />
          <p className="text-emerald-400 text-sm font-medium">All clear</p>
          <p className="text-zinc-600 text-xs mt-1">No escalations to review</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((esc) => (
            <div
              key={esc.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:bg-[var(--color-card-hover)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      esc.severity === "critical"
                        ? "text-red-400"
                        : esc.severity === "high"
                          ? "text-orange-400"
                          : esc.severity === "medium"
                            ? "text-amber-400"
                            : "text-zinc-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-zinc-200">{esc.description}</p>
                    <div className="flex gap-2 mt-1.5 text-xs text-zinc-500">
                      <span>{esc.source_agent}</span>
                      {esc.rig && (
                        <>
                          <span className="text-zinc-700">&middot;</span>
                          <span>{esc.rig}</span>
                        </>
                      )}
                      <span className="text-zinc-700">&middot;</span>
                      <span>
                        {new Date(esc.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <StatusBadge status={esc.severity} />
                  <StatusBadge status={esc.status} />
                </div>
              </div>

              {esc.status === "open" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => handleAck(esc.id)}
                    disabled={acting === esc.id}
                    className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors disabled:opacity-50"
                  >
                    {acting === esc.id ? "..." : "Acknowledge"}
                  </button>
                  <button
                    onClick={() => handleClose(esc.id)}
                    disabled={acting === esc.id}
                    className="rounded-md border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                  >
                    {acting === esc.id ? "..." : "Resolve"}
                  </button>
                </div>
              )}

              {esc.status === "acknowledged" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => handleClose(esc.id)}
                    disabled={acting === esc.id}
                    className="rounded-md border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                  >
                    {acting === esc.id ? "..." : "Resolve"}
                  </button>
                </div>
              )}

              {esc.reason && (
                <p className="text-xs text-zinc-600 mt-2">
                  Reason: {esc.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/pages/escalations.tsx
git commit -m "feat(web): add escalations page with severity sorting and ack/close actions"
```

---

## Task 10: Wire Up Frontend — Sidebar, Router, App

**Files:**
- Modify: `packages/web/src/components/layout/sidebar.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Update sidebar.tsx — add 3 nav items**

In `packages/web/src/components/layout/sidebar.tsx`, update the import line to add new icons:

Replace:
```tsx
import { LayoutDashboard, Users, CircleDot, Server, PanelLeftClose, PanelLeft } from "lucide-react";
```

With:
```tsx
import { LayoutDashboard, Users, CircleDot, Server, Truck, GitMerge, AlertTriangle, PanelLeftClose, PanelLeft } from "lucide-react";
```

Then update the `navItems` array — replace the entire array:

```tsx
const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/agents", label: "Agents", icon: Users },
  { to: "/beads", label: "Beads", icon: CircleDot },
  { to: "/rigs", label: "Rigs", icon: Server },
  { to: "/convoys", label: "Convoys", icon: Truck },
  { to: "/refinery", label: "Refinery", icon: GitMerge },
  { to: "/escalations", label: "Escalations", icon: AlertTriangle },
];
```

- [ ] **Step 2: Update App.tsx — add routes and imports**

Replace the entire file `packages/web/src/App.tsx` with:

```tsx
import { Routes, Route } from "react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StatusBar } from "@/components/layout/status-bar";
import { OverviewPage } from "@/pages/overview";
import { AgentsPage } from "@/pages/agents";
import { BeadsPage } from "@/pages/beads";
import { RigsPage } from "@/pages/rigs";
import { ConvoysPage } from "@/pages/convoys";
import { RefineryPage } from "@/pages/refinery";
import { EscalationsPage } from "@/pages/escalations";

export function App() {
  return (
    <div className="flex h-screen bg-[var(--color-surface)]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/beads" element={<BeadsPage />} />
            <Route path="/rigs" element={<RigsPage />} />
            <Route path="/convoys" element={<ConvoysPage />} />
            <Route path="/refinery" element={<RefineryPage />} />
            <Route path="/escalations" element={<EscalationsPage />} />
          </Routes>
        </main>
        <StatusBar />
      </div>
    </div>
  );
}
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
git commit -m "feat(web): wire up convoys, refinery, and escalations in sidebar and router"
```

---

## Task 11: Verification

- [ ] **Step 1: Start the full stack**

```bash
pnpm dev
```

- [ ] **Step 2: Test all new API endpoints**

```bash
curl -s http://localhost:4800/api/convoys
curl -s http://localhost:4800/api/refinery
curl -s http://localhost:4800/api/refinery/abhik_portfolio
curl -s http://localhost:4800/api/escalations
```

Expected: Each returns `[]`. No 500 errors.

- [ ] **Step 3: Verify all 7 pages in browser**

Open `http://localhost:5173` and click through every sidebar item:

1. **Overview** — stat cards, live feed, rig health (existing, still works)
2. **Agents** — table with role filter, nudge buttons (existing, still works)
3. **Beads** — sortable table with status filters (existing, still works)
4. **Rigs** — card grid (existing, still works)
5. **Convoys** — shows empty state: truck icon + "No active convoys" message
6. **Refinery** — shows per-rig sections, each with "Queue empty" or merge icon empty state
7. **Escalations** — shows green "All clear" empty state with checkmark

Verify sidebar highlights correctly on each page (only one item active at a time).

- [ ] **Step 4: Verify status bar still works**

Bottom bar should still show health dot, agent count, rig count, bead count.

---

## Summary

| Task | What it builds | Key files |
|------|---------------|-----------|
| 1 | TypeScript interfaces | types.ts |
| 2 | Convoys API route | routes/convoys.ts |
| 3 | Refinery API route | routes/refinery.ts |
| 4 | Escalations API route | routes/escalations.ts |
| 5 | Register routes in Express | index.ts |
| 6 | Status badge variants | status-badge.tsx |
| 7 | Convoys page | pages/convoys.tsx |
| 8 | Refinery page | pages/refinery.tsx |
| 9 | Escalations page | pages/escalations.tsx |
| 10 | Wire up sidebar + router | sidebar.tsx, App.tsx |
| 11 | End-to-end verification | Manual walkthrough |

11 tasks. Tasks 1-5 are backend, Tasks 6-9 are frontend pages, Task 10 wires everything together, Task 11 verifies. Each task produces a working commit.
