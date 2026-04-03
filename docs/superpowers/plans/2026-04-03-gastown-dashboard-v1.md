# Gas Town Dashboard v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working dark-mode monitoring dashboard for Gas Town that shows real-time agent activity, rig health, bead tracking, and a live event feed — powered by `gt` and `bd` CLI commands via a lightweight Express backend.

**Architecture:** Monorepo with pnpm workspaces. Express backend (port 4800) shells out to `gt`/`bd` CLI commands, caches responses (7s TTL), and streams `.events.jsonl` via SSE. React 18 frontend (Vite, port 5173) consumes REST + SSE endpoints. Vite proxies `/api/*` to Express in dev.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Vite 6, shadcn/ui, Recharts, Lucide React, react-router v7, Express 5, node:child_process

---

## File Structure

```
gastown-dashboard/
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json                      # dev/build pipeline
├── packages/
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts           # Express app, SSE setup, listen on 4800
│   │   │   ├── cli.ts            # Shell out to gt/bd, parse, cache
│   │   │   ├── parsers.ts        # Text output parsers (agents list, feed)
│   │   │   ├── feed.ts           # SSE: tail .events.jsonl, push to clients
│   │   │   └── routes/
│   │   │       ├── overview.ts    # GET /api/overview
│   │   │       ├── rigs.ts        # GET /api/rigs
│   │   │       ├── agents.ts      # GET /api/agents, POST /api/agents/:name/nudge
│   │   │       └── beads.ts       # GET /api/beads, GET /api/beads/:id
│   │   └── (no test files in v1)
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── (no tailwind.config.ts — Tailwind v4 uses CSS-based config)
│       ├── index.html
│       ├── components.json         # shadcn/ui config
│       ├── src/
│       │   ├── main.tsx            # React root + router
│       │   ├── App.tsx             # Layout wrapper + routes
│       │   ├── globals.css         # Tailwind imports + dark theme vars
│       │   ├── lib/
│       │   │   ├── utils.ts        # cn() helper (shadcn standard)
│       │   │   ├── api.ts          # Typed fetch wrapper
│       │   │   └── types.ts        # Shared TypeScript interfaces
│       │   ├── hooks/
│       │   │   ├── use-fetch.ts    # SWR-style polling hook
│       │   │   └── use-sse.ts      # SSE subscription hook
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── sidebar.tsx
│       │   │   │   ├── topbar.tsx
│       │   │   │   └── status-bar.tsx
│       │   │   ├── ui/             # shadcn/ui components (installed via CLI)
│       │   │   ├── stat-card.tsx
│       │   │   ├── status-badge.tsx
│       │   │   ├── live-feed.tsx
│       │   │   └── data-table.tsx
│       │   └── pages/
│       │       ├── overview.tsx
│       │       ├── agents.tsx
│       │       ├── beads.tsx
│       │       └── rigs.tsx
│       └── (no test files in v1)
```

---

## Task 1: Scaffold Monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/vite.config.ts`
- Create: `packages/web/index.html`

- [ ] **Step 1: Create workspace root package.json**

```json
{
  "name": "gastown-dashboard",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build"
  },
  "devDependencies": {
    "turbo": "^2"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "outputs": ["dist/**"]
    }
  }
}
```

- [ ] **Step 4: Create packages/server/package.json**

```json
{
  "name": "@gastown/server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "express": "^5.1.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^5",
    "@types/cors": "^2",
    "@types/node": "^22",
    "tsx": "^4",
    "typescript": "^5.7"
  }
}
```

- [ ] **Step 5: Create packages/server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create packages/web/package.json**

```json
{
  "name": "@gastown/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router": "^7",
    "recharts": "^2.15",
    "lucide-react": "^0.500",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^3"
  },
  "devDependencies": {
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4",
    "typescript": "^5.7",
    "vite": "^6"
  }
}
```

- [ ] **Step 7: Create packages/web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 8: Create packages/web/vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4800",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 9: Create packages/web/index.html**

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gas Town</title>
  </head>
  <body class="bg-[#0a0a0a] text-zinc-100 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Install dependencies**

Run: `cd /Users/abhiksarkar/Documents/Projects/personal/gastown-dashboard && pnpm install`
Expected: Lockfile created, all packages resolved.

- [ ] **Step 11: Verify both packages start**

Run: `cd packages/server && echo 'console.log("server ok")' > src/index.ts && cd ../.. && cd packages/web && mkdir -p src && echo 'document.getElementById("root")!.innerHTML = "ok"' > src/main.tsx && cd ../..`

Then: `pnpm dev` — verify both processes start (kill after confirming).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "scaffold: pnpm monorepo with server + web packages"
```

---

## Task 2: Express Backend — CLI Runner + Cache

**Files:**
- Create: `packages/server/src/cli.ts`
- Create: `packages/server/src/parsers.ts`
- Create: `packages/server/src/index.ts`

- [ ] **Step 1: Create packages/server/src/cli.ts**

This is the core utility. It shells out to `gt`/`bd`, caches results with TTL, and handles stderr warnings.

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 7000; // 7 seconds

export async function runCli(
  command: string,
  args: string[],
  ttl = DEFAULT_TTL
): Promise<unknown> {
  const key = `${command}:${args.join(":")}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const { stdout } = await exec(command, args, {
    timeout: 15000,
    env: { ...process.env, NO_COLOR: "1" },
  });

  let data: unknown;
  try {
    data = JSON.parse(stdout);
  } catch {
    // Not JSON — return raw text
    data = stdout.trim();
  }

  cache.set(key, { data, expiresAt: now + ttl });
  return data;
}

export async function runAction(
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  // No caching for write actions
  const { stdout, stderr } = await exec(command, args, {
    timeout: 15000,
    env: { ...process.env, NO_COLOR: "1" },
  });
  // Invalidate related caches
  cache.clear();
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}
```

- [ ] **Step 2: Create packages/server/src/parsers.ts**

Parses text output from commands that lack `--json` support.

```ts
// Parse `gt agents list --all` text output into structured data
// Example input:
//   🎩 Mayor
//   🐺 Deacon
//   ── abhik_portfolio ──
//   🦉 witness
//   👷 crew/abhik
export function parseAgentsList(text: string): Array<{
  name: string;
  role: string;
  rig: string | null;
  icon: string;
}> {
  const lines = text.split("\n").filter((l) => l.trim());
  const agents: Array<{
    name: string;
    role: string;
    rig: string | null;
    icon: string;
  }> = [];
  let currentRig: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    // Rig header: ── rigname ──
    const rigMatch = trimmed.match(/^──\s+(.+?)\s+──$/);
    if (rigMatch) {
      currentRig = rigMatch[1];
      continue;
    }

    // Agent line: emoji Name or emoji role/name
    const agentMatch = trimmed.match(/^(\S+)\s+(.+)$/);
    if (agentMatch) {
      const icon = agentMatch[1];
      const name = agentMatch[2];
      const role = iconToRole(icon);
      agents.push({ name, role, rig: currentRig, icon });
    }
  }
  return agents;
}

function iconToRole(icon: string): string {
  const map: Record<string, string> = {
    "\u{1F3A9}": "mayor",
    "\u{1F43A}": "deacon",
    "\u{1F989}": "witness",
    "\u{1F477}": "crew",
    "\u{1F63A}": "polecat",
  };
  return map[icon] || "unknown";
}

// Parse `gt feed --plain --since Xh` text output
// Example: [16:54:45] → mayor   session_start
export function parseFeedLines(
  text: string
): Array<{ time: string; actor: string; event: string }> {
  const lines = text.split("\n").filter((l) => l.trim());
  return lines.map((line) => {
    const match = line.match(
      /^\[([^\]]+)\]\s+\S+\s+(\S+)\s+(.+)$/
    );
    if (!match) return { time: "", actor: "", event: line.trim() };
    return { time: match[1], actor: match[2].trim(), event: match[3].trim() };
  });
}
```

- [ ] **Step 3: Create packages/server/src/index.ts**

```ts
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

const PORT = process.env.PORT || 4800;
app.listen(PORT, () => {
  console.log(`[gastown-server] listening on :${PORT}`);
});
```

- [ ] **Step 4: Verify server starts and health endpoint works**

Run: `cd /Users/abhiksarkar/Documents/Projects/personal/gastown-dashboard && pnpm --filter @gastown/server dev &`
Then: `sleep 2 && curl -s http://localhost:4800/api/health | python3 -m json.tool`
Expected: `{"status": "ok", "ts": "..."}`
Kill the server after.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/
git commit -m "feat(server): add CLI runner with caching and text parsers"
```

---

## Task 3: Backend API Routes

**Files:**
- Create: `packages/server/src/routes/overview.ts`
- Create: `packages/server/src/routes/rigs.ts`
- Create: `packages/server/src/routes/agents.ts`
- Create: `packages/server/src/routes/beads.ts`
- Modify: `packages/server/src/index.ts` — register routes

- [ ] **Step 1: Create packages/server/src/routes/overview.ts**

Aggregates data from multiple CLI commands into a single overview response.

```ts
import { Router } from "express";
import { runCli } from "../cli.js";
import { parseAgentsList } from "../parsers.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const [rigsRaw, agentsRaw, beadsRaw, schedulerRaw] = await Promise.all([
      runCli("gt", ["rig", "list", "--json"]),
      runCli("gt", ["agents", "list", "--all"]),
      runCli("bd", ["list", "--json"]),
      runCli("gt", ["scheduler", "status", "--json"]),
    ]);

    const rigs = Array.isArray(rigsRaw) ? rigsRaw : [];
    const agents =
      typeof agentsRaw === "string" ? parseAgentsList(agentsRaw) : [];
    const beads = Array.isArray(beadsRaw) ? beadsRaw : [];
    const scheduler = schedulerRaw ?? {};

    const completed = beads.filter(
      (b: any) => b.status === "completed" || b.status === "done"
    );

    res.json({
      rigs: {
        total: rigs.length,
        items: rigs,
      },
      agents: {
        total: agents.length,
        items: agents,
      },
      beads: {
        total: beads.length,
        open: beads.filter((b: any) => b.status === "open").length,
        in_progress: beads.filter(
          (b: any) => b.status === "in_progress" || b.status === "hooked"
        ).length,
        completed: completed.length,
      },
      scheduler,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: Create packages/server/src/routes/rigs.ts**

```ts
import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["rig", "list", "--json"]);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 3: Create packages/server/src/routes/agents.ts**

```ts
import { Router } from "express";
import { runCli, runAction } from "../cli.js";
import { parseAgentsList } from "../parsers.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const raw = await runCli("gt", ["agents", "list", "--all"]);
    const agents = typeof raw === "string" ? parseAgentsList(raw) : [];
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:name/nudge", async (req, res) => {
  try {
    const { name } = req.params;
    const message = req.body.message || "Nudge from dashboard";
    const result = await runAction("gt", [
      "nudge",
      name,
      "--mode",
      "queue",
      message,
    ]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 4: Create packages/server/src/routes/beads.ts**

```ts
import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const data = await runCli("bd", ["list", "--json"]);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    // bd show doesn't support --json, so find the bead from the full list
    const all = await runCli("bd", ["list", "--json"]);
    const beads = Array.isArray(all) ? all : [];
    const bead = beads.find((b: any) => b.id === req.params.id);
    res.json(bead ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 5: Update packages/server/src/index.ts to register routes**

Replace the entire file:

```ts
import express from "express";
import cors from "cors";
import overviewRoutes from "./routes/overview.js";
import rigsRoutes from "./routes/rigs.js";
import agentsRoutes from "./routes/agents.js";
import beadsRoutes from "./routes/beads.js";

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

const PORT = process.env.PORT || 4800;
app.listen(PORT, () => {
  console.log(`[gastown-server] listening on :${PORT}`);
});
```

- [ ] **Step 6: Test all endpoints with curl**

Start server, then run each:

```bash
curl -s http://localhost:4800/api/health
curl -s http://localhost:4800/api/overview | python3 -m json.tool
curl -s http://localhost:4800/api/rigs | python3 -m json.tool
curl -s http://localhost:4800/api/agents | python3 -m json.tool
curl -s http://localhost:4800/api/beads | python3 -m json.tool
```

Expected: Each returns valid JSON. Overview contains nested rigs/agents/beads/scheduler objects. Agents list contains at least Mayor, Deacon. Rigs list contains abhik_portfolio and gastown_dashboard.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/
git commit -m "feat(server): add REST routes for overview, rigs, agents, beads"
```

---

## Task 4: SSE Live Feed

**Files:**
- Create: `packages/server/src/feed.ts`
- Modify: `packages/server/src/index.ts` — mount SSE endpoint

- [ ] **Step 1: Create packages/server/src/feed.ts**

Tails `~/.gt/.events.jsonl` (or the path from `$GT_HOME`) and pushes new lines to SSE clients.

```ts
import { Router, Request, Response } from "express";
import { createReadStream, watchFile, unwatchFile, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import path from "node:path";

const router = Router();

const EVENTS_FILE = path.join(
  process.env.GT_HOME || path.join(homedir(), "gt"),
  ".events.jsonl"
);

// Maintain a buffer of recent events for initial load
const recentEvents: string[] = [];
const MAX_RECENT = 100;

function addEvent(line: string) {
  recentEvents.push(line);
  if (recentEvents.length > MAX_RECENT) {
    recentEvents.shift();
  }
}

// On startup, read last 100 lines
function seedRecentEvents() {
  try {
    const rl = createInterface({
      input: createReadStream(EVENTS_FILE, { encoding: "utf-8" }),
    });
    const buffer: string[] = [];
    rl.on("line", (line) => {
      buffer.push(line);
      if (buffer.length > MAX_RECENT) buffer.shift();
    });
    rl.on("close", () => {
      buffer.forEach(addEvent);
    });
  } catch {
    // File may not exist yet
  }
}

seedRecentEvents();

// SSE connections
const clients = new Set<Response>();

// Watch for file changes
let lastSize = 0;
try {
  lastSize = statSync(EVENTS_FILE).size;
} catch {
  // File may not exist
}

watchFile(EVENTS_FILE, { interval: 1000 }, (curr) => {
  if (curr.size <= lastSize) {
    lastSize = curr.size;
    return;
  }

  const stream = createReadStream(EVENTS_FILE, {
    start: lastSize,
    encoding: "utf-8",
  });
  const rl = createInterface({ input: stream });

  rl.on("line", (line) => {
    if (!line.trim()) return;
    addEvent(line);
    for (const client of clients) {
      client.write(`data: ${line}\n\n`);
    }
  });

  lastSize = curr.size;
});

router.get("/stream", (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send recent events as initial batch
  for (const event of recentEvents) {
    res.write(`data: ${event}\n\n`);
  }

  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
  });
});

export default router;

// Cleanup on process exit
process.on("SIGTERM", () => {
  unwatchFile(EVENTS_FILE);
});
```

- [ ] **Step 2: Mount SSE route in index.ts**

Add to `packages/server/src/index.ts` after the beads route import:

```ts
import feedRoutes from "./feed.js";
```

And after `app.use("/api/beads", beadsRoutes);`:

```ts
app.use("/api/feed", feedRoutes);
```

- [ ] **Step 3: Test SSE endpoint**

Start server, then in another terminal:

```bash
curl -N http://localhost:4800/api/feed/stream
```

Expected: Connection stays open. Recent events stream as `data: {...}\n\n` lines. If a new event fires in Gas Town (any agent activity), it appears in real time.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/
git commit -m "feat(server): add SSE live feed from .events.jsonl"
```

---

## Task 5: Frontend Foundation — Tailwind, Types, Hooks

**Files:**
- Create: `packages/web/src/globals.css`
- Create: `packages/web/src/lib/utils.ts`
- Create: `packages/web/src/lib/types.ts`
- Create: `packages/web/src/lib/api.ts`
- Create: `packages/web/src/hooks/use-fetch.ts`
- Create: `packages/web/src/hooks/use-sse.ts`
- Create: `packages/web/src/main.tsx`

- [ ] **Step 1: Create packages/web/src/globals.css**

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-card: #141414;
  --color-card-hover: #1a1a1a;
  --color-border: #262626;
  --color-surface: #0a0a0a;
  --color-accent: #3b82f6;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius-lg: 0.75rem;
  --radius-md: 0.5rem;
  --radius-sm: 0.25rem;
}

body {
  font-family: var(--font-sans);
}

/* Scrollbar styling for dark mode */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}
```

- [ ] **Step 2: Create packages/web/src/lib/utils.ts**

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create packages/web/src/lib/types.ts**

Interfaces matching the actual CLI JSON output shapes we observed:

```ts
// From `gt rig list --json`
export interface Rig {
  name: string;
  beads_prefix: string;
  status: string;
  witness: string;
  refinery: string;
  polecats: number;
  crew: number;
}

// From our parsers.ts
export interface Agent {
  name: string;
  role: string;
  rig: string | null;
  icon: string;
}

// From `bd list --json`
export interface Bead {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  issue_type: string;
  assignee: string;
  owner: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  labels: string[];
  dependency_count: number;
  dependent_count: number;
  comment_count: number;
}

// From `gt scheduler status --json`
export interface Scheduler {
  paused: boolean;
  queued_total: number;
  queued_ready: number;
  active_polecats: number;
  beads: unknown[] | null;
}

// From /api/overview
export interface Overview {
  rigs: { total: number; items: Rig[] };
  agents: { total: number; items: Agent[] };
  beads: {
    total: number;
    open: number;
    in_progress: number;
    completed: number;
  };
  scheduler: Scheduler;
}

// From .events.jsonl
export interface FeedEvent {
  ts: string;
  source: string;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
  visibility: string;
}
```

- [ ] **Step 4: Create packages/web/src/lib/api.ts**

```ts
const BASE = "/api";

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function apiPost<T>(
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
```

- [ ] **Step 5: Create packages/web/src/hooks/use-fetch.ts**

```ts
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

interface UseFetchResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useFetch<T>(
  path: string,
  intervalMs = 5000
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const result = await apiFetch<T>(path);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => clearInterval(id);
  }, [fetchData, intervalMs]);

  return { data, error, loading, refetch: fetchData };
}
```

- [ ] **Step 6: Create packages/web/src/hooks/use-sse.ts**

```ts
import { useState, useEffect, useRef } from "react";
import type { FeedEvent } from "@/lib/types";

export function useSSE(url: string, maxEvents = 200) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const event: FeedEvent = JSON.parse(e.data);
        setEvents((prev) => {
          const next = [...prev, event];
          return next.length > maxEvents ? next.slice(-maxEvents) : next;
        });
      } catch {
        // Skip malformed events
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
    };
  }, [url, maxEvents]);

  return { events, connected };
}
```

- [ ] **Step 7: Create packages/web/src/main.tsx**

Minimal entry point to confirm the frontend works:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-2xl font-semibold text-zinc-100">
        Gas Town Dashboard
      </h1>
    </div>
  </StrictMode>
);
```

- [ ] **Step 8: Verify frontend builds and shows the placeholder**

Run: `pnpm dev` from workspace root.
Open: `http://localhost:5173`
Expected: Dark background (#0a0a0a), centered white text "Gas Town Dashboard".

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/
git commit -m "feat(web): add Tailwind theme, TypeScript types, fetch/SSE hooks"
```

---

## Task 6: shadcn/ui Setup + Shared Components

**Files:**
- Create: `packages/web/components.json`
- Create: `packages/web/src/components/ui/` (via shadcn CLI)
- Create: `packages/web/src/components/stat-card.tsx`
- Create: `packages/web/src/components/status-badge.tsx`

- [ ] **Step 1: Create packages/web/components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: Install shadcn/ui components**

Run from `packages/web/`:

```bash
npx shadcn@latest add badge table card separator scroll-area tooltip --yes
```

Expected: Components created in `src/components/ui/`.

If the CLI prompts interactively or fails, manually install the dependencies:

```bash
pnpm add @radix-ui/react-tooltip @radix-ui/react-scroll-area @radix-ui/react-separator
```

And copy the component files from the shadcn/ui registry. The key components we need are: `badge.tsx`, `table.tsx`, `card.tsx`, `separator.tsx`, `scroll-area.tsx`, `tooltip.tsx`.

- [ ] **Step 3: Create packages/web/src/components/stat-card.tsx**

A reusable stat card for the overview page hero row.

```tsx
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5",
        "hover:bg-[var(--color-card-hover)] transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-zinc-400">{label}</span>
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-zinc-100 tabular-nums">
          {value}
        </span>
        {trend && trend !== "neutral" && (
          <span
            className={cn(
              "text-xs font-medium",
              trend === "up" ? "text-[var(--color-success)]" : "text-[var(--color-error)]"
            )}
          >
            {trend === "up" ? "\u2191" : "\u2193"}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create packages/web/src/components/status-badge.tsx**

```tsx
import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  running: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  stopped: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  operational: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  hooked: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  open: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  blocked: "bg-red-500/10 text-red-400 border-red-500/20",
  mayor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  deacon: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  witness: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  crew: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  polecat: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = variants[status] || variants.stopped;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variant,
        className
      )}
    >
      {status}
    </span>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/
git commit -m "feat(web): add shadcn/ui components, stat card, status badge"
```

---

## Task 7: App Layout — Sidebar, Top Bar, Status Bar

**Files:**
- Create: `packages/web/src/components/layout/sidebar.tsx`
- Create: `packages/web/src/components/layout/topbar.tsx`
- Create: `packages/web/src/components/layout/status-bar.tsx`
- Create: `packages/web/src/App.tsx`
- Modify: `packages/web/src/main.tsx` — mount App with router

- [ ] **Step 1: Create packages/web/src/components/layout/sidebar.tsx**

```tsx
import { useState } from "react";
import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CircleDot,
  Server,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/agents", label: "Agents", icon: Users },
  { to: "/beads", label: "Beads", icon: CircleDot },
  { to: "/rigs", label: "Rigs", icon: Server },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]",
        "transition-[width] duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo area */}
      <div className="flex items-center h-14 px-4 border-b border-[var(--color-border)]">
        {!collapsed && (
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">
            Gas Town
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors",
            collapsed ? "mx-auto" : "ml-auto"
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Create packages/web/src/components/layout/topbar.tsx**

```tsx
export function Topbar() {
  return (
    <header className="flex items-center h-14 px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <h1 className="text-sm font-semibold text-zinc-100">Gas Town HQ</h1>
      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-zinc-500">
          <kbd className="font-mono">⌘K</kbd>
          <span>Search</span>
        </div>
        <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
          O
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create packages/web/src/components/layout/status-bar.tsx**

```tsx
import { useFetch } from "@/hooks/use-fetch";
import type { Overview } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { data } = useFetch<Overview>("/overview", 10000);

  const health = data
    ? data.rigs.items.every((r) => r.status === "operational")
      ? "healthy"
      : "degraded"
    : "loading";

  const healthColor: Record<string, string> = {
    healthy: "bg-emerald-500",
    degraded: "bg-amber-500",
    loading: "bg-zinc-500",
  };

  return (
    <footer className="flex items-center h-7 px-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-zinc-500">
      <div className="flex items-center gap-2">
        <span
          className={cn("h-2 w-2 rounded-full", healthColor[health])}
        />
        <span className="capitalize">{health}</span>
      </div>
      {data && (
        <>
          <span className="mx-3 text-zinc-700">|</span>
          <span>{data.agents.total} agents</span>
          <span className="mx-3 text-zinc-700">|</span>
          <span>{data.rigs.total} rigs</span>
          <span className="mx-3 text-zinc-700">|</span>
          <span>{data.beads.total} beads</span>
        </>
      )}
    </footer>
  );
}
```

- [ ] **Step 4: Create packages/web/src/App.tsx**

```tsx
import { Routes, Route } from "react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StatusBar } from "@/components/layout/status-bar";

function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full text-zinc-500">
      {name} — coming soon
    </div>
  );
}

export function App() {
  return (
    <div className="flex h-screen bg-[var(--color-surface)]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Placeholder name="Overview" />} />
            <Route path="/agents" element={<Placeholder name="Agents" />} />
            <Route path="/beads" element={<Placeholder name="Beads" />} />
            <Route path="/rigs" element={<Placeholder name="Rigs" />} />
          </Routes>
        </main>
        <StatusBar />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update packages/web/src/main.tsx**

Replace the entire file:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "@/App";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 6: Verify the layout renders**

Run: `pnpm dev`
Open: `http://localhost:5173`
Expected:
- Dark background
- Left sidebar with 4 nav items (Overview, Agents, Beads, Rigs) and a collapse button
- Top bar with "Gas Town HQ", cmd+K placeholder, and avatar
- Bottom status bar showing health dot, agent count, rig count, bead count (real data from API)
- Main area shows "Overview — coming soon" placeholder
- Clicking sidebar nav items changes the placeholder text
- Sidebar collapses to icon-only when collapse button is clicked

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/
git commit -m "feat(web): add app layout with sidebar, topbar, status bar, and routing"
```

---

## Task 8: Overview Page

**Files:**
- Create: `packages/web/src/components/live-feed.tsx`
- Create: `packages/web/src/pages/overview.tsx`
- Modify: `packages/web/src/App.tsx` — swap placeholder for real page

- [ ] **Step 1: Create packages/web/src/components/live-feed.tsx**

Real-time event feed using the SSE hook.

```tsx
import { useSSE } from "@/hooks/use-sse";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const eventColors: Record<string, string> = {
  session_start: "text-blue-400",
  slung: "text-purple-400",
  hooked: "text-cyan-400",
  nudge: "text-amber-400",
  completed: "text-emerald-400",
  done: "text-emerald-400",
  error: "text-red-400",
};

export function LiveFeed() {
  const { events, connected } = useSSE("/api/feed/stream");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-medium text-zinc-200">Live Feed</h3>
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            connected ? "bg-emerald-500" : "bg-red-500"
          )}
        />
      </div>
      <div
        ref={scrollRef}
        className="h-72 overflow-y-auto p-3 font-mono text-xs space-y-0.5"
      >
        {events.length === 0 && (
          <p className="text-zinc-600 text-center py-8">
            Waiting for events...
          </p>
        )}
        {events.map((evt, i) => {
          const time = new Date(evt.ts).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          const color = eventColors[evt.type] || "text-zinc-400";
          return (
            <div key={`${evt.ts}-${i}`} className="flex gap-2">
              <span className="text-zinc-600 shrink-0">{time}</span>
              <span className={cn("shrink-0", color)}>{evt.type}</span>
              <span className="text-zinc-400 truncate">{evt.actor}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create packages/web/src/pages/overview.tsx**

```tsx
import { useFetch } from "@/hooks/use-fetch";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { LiveFeed } from "@/components/live-feed";
import type { Overview as OverviewData } from "@/lib/types";
import { Server, Users, CircleDot, CheckCircle } from "lucide-react";

export function OverviewPage() {
  const { data, loading, error } = useFetch<OverviewData>("/overview", 5000);

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load overview: {error}
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-[var(--color-card)] animate-pulse"
            />
          ))}
        </div>
        <div className="h-72 rounded-lg bg-[var(--color-card)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Rigs" value={data.rigs.total} icon={Server} />
        <StatCard label="Agents" value={data.agents.total} icon={Users} />
        <StatCard
          label="Active Beads"
          value={data.beads.in_progress}
          icon={CircleDot}
        />
        <StatCard
          label="Completed"
          value={data.beads.completed}
          icon={CheckCircle}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Live feed */}
        <LiveFeed />

        {/* Rig status cards */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-medium text-zinc-200">Rig Health</h3>
          </div>
          <div className="p-4 space-y-3">
            {data.rigs.items.map((rig) => (
              <div
                key={rig.name}
                className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-3"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    {rig.name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {rig.beads_prefix} prefix &middot; {rig.crew} crew &middot;{" "}
                    {rig.polecats} polecats
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={rig.witness} />
                  <StatusBadge status={rig.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scheduler status */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">Scheduler:</span>
          <StatusBadge
            status={data.scheduler.paused ? "paused" : "running"}
          />
          <span className="text-zinc-500">
            {data.scheduler.queued_total} queued &middot;{" "}
            {data.scheduler.active_polecats} active polecats
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx to use OverviewPage**

In `packages/web/src/App.tsx`, add the import:

```tsx
import { OverviewPage } from "@/pages/overview";
```

And replace the overview route:

```tsx
<Route path="/" element={<OverviewPage />} />
```

- [ ] **Step 4: Verify the overview page**

Run: `pnpm dev` (both server + client)
Open: `http://localhost:5173`
Expected:
- 4 stat cards showing real counts (rigs, agents, active beads, completed)
- Live feed panel on the left with scrolling events from `.events.jsonl`
- Rig health panel on the right listing each rig with witness + operational badges
- Scheduler status bar at the bottom
- Loading skeletons appear briefly before data loads
- Data auto-refreshes every 5 seconds

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/
git commit -m "feat(web): add overview page with stats, live feed, and rig health"
```

---

## Task 9: Agents Page

**Files:**
- Create: `packages/web/src/pages/agents.tsx`
- Modify: `packages/web/src/App.tsx` — swap placeholder

- [ ] **Step 1: Create packages/web/src/pages/agents.tsx**

```tsx
import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import { apiPost } from "@/lib/api";
import type { Agent } from "@/lib/types";

export function AgentsPage() {
  const { data, loading, error, refetch } = useFetch<Agent[]>(
    "/agents",
    10000
  );
  const [nudging, setNudging] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const roles = ["all", "mayor", "deacon", "witness", "crew", "polecat"];

  const filtered = data
    ? roleFilter === "all"
      ? data
      : data.filter((a) => a.role === roleFilter)
    : [];

  async function handleNudge(name: string) {
    setNudging(name);
    try {
      await apiPost(`/agents/${encodeURIComponent(name)}/nudge`, {
        message: "Nudge from Gas Town Dashboard",
      });
      refetch();
    } catch {
      // Nudge failed — agent may not have a session
    } finally {
      setNudging(null);
    }
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load agents: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Agents</h2>
        <div className="flex gap-1">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                roleFilter === role
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg bg-[var(--color-card)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
                <th className="text-left font-medium text-zinc-400 px-4 py-3">
                  Agent
                </th>
                <th className="text-left font-medium text-zinc-400 px-4 py-3">
                  Role
                </th>
                <th className="text-left font-medium text-zinc-400 px-4 py-3">
                  Rig
                </th>
                <th className="text-right font-medium text-zinc-400 px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent) => (
                <tr
                  key={`${agent.rig}-${agent.name}`}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{agent.icon}</span>
                      <span className="text-zinc-200 font-medium">
                        {agent.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={agent.role} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {agent.rig || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        const target = agent.rig
                          ? `${agent.rig}/${agent.name}`
                          : agent.name;
                        handleNudge(target);
                      }}
                      disabled={nudging !== null}
                      className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors disabled:opacity-50"
                    >
                      {nudging ===
                      (agent.rig
                        ? `${agent.rig}/${agent.name}`
                        : agent.name)
                        ? "Nudging..."
                        : "Nudge"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-zinc-600"
                  >
                    No agents found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx**

Add import:

```tsx
import { AgentsPage } from "@/pages/agents";
```

Replace agents route:

```tsx
<Route path="/agents" element={<AgentsPage />} />
```

- [ ] **Step 3: Verify the agents page**

Open: `http://localhost:5173/agents`
Expected:
- Table showing Mayor, Deacon, and rig-specific agents (witness, crew/abhik)
- Each row has icon, name, role badge, rig name
- Role filter buttons work (clicking "witness" shows only witnesses)
- Nudge button sends POST request (may fail for agents without sessions — that's fine)

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/
git commit -m "feat(web): add agents page with table, role filter, and nudge action"
```

---

## Task 10: Beads Page

**Files:**
- Create: `packages/web/src/pages/beads.tsx`
- Modify: `packages/web/src/App.tsx` — swap placeholder

- [ ] **Step 1: Create packages/web/src/pages/beads.tsx**

```tsx
import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { Bead } from "@/lib/types";

type SortKey = "priority" | "updated_at" | "created_at" | "status";

export function BeadsPage() {
  const { data, loading, error } = useFetch<Bead[]>("/beads", 10000);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortAsc, setSortAsc] = useState(true);

  const statuses = ["all", "open", "hooked", "in_progress", "completed", "done"];

  const filtered = useMemo(() => {
    if (!data) return [];
    let result =
      statusFilter === "all"
        ? data
        : data.filter((b) => b.status === statusFilter);
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "priority") {
        cmp = a.priority - b.priority;
      } else if (sortKey === "updated_at" || sortKey === "created_at") {
        cmp =
          new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime();
      } else if (sortKey === "status") {
        cmp = a.status.localeCompare(b.status);
      }
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [data, statusFilter, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function SortHeader({
    label,
    field,
  }: {
    label: string;
    field: SortKey;
  }) {
    return (
      <th
        className="text-left font-medium text-zinc-400 px-4 py-3 cursor-pointer hover:text-zinc-200 select-none"
        onClick={() => handleSort(field)}
      >
        {label}
        {sortKey === field && (
          <span className="ml-1">{sortAsc ? "\u2191" : "\u2193"}</span>
        )}
      </th>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load beads: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Beads</h2>
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
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg bg-[var(--color-card)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
                <th className="text-left font-medium text-zinc-400 px-4 py-3">
                  ID
                </th>
                <th className="text-left font-medium text-zinc-400 px-4 py-3">
                  Title
                </th>
                <th className="text-left font-medium text-zinc-400 px-4 py-3">
                  Status
                </th>
                <SortHeader label="Priority" field="priority" />
                <th className="text-left font-medium text-zinc-400 px-4 py-3">
                  Assignee
                </th>
                <SortHeader label="Updated" field="updated_at" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((bead) => (
                <tr
                  key={bead.id}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {bead.id}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-zinc-200 font-medium truncate max-w-md">
                        {bead.title}
                      </p>
                      {bead.labels.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {bead.labels.map((l) => (
                            <span
                              key={l}
                              className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={bead.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400 tabular-nums">
                    P{bead.priority}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {bead.assignee || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(bead.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-zinc-600"
                  >
                    No beads found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx**

Add import:

```tsx
import { BeadsPage } from "@/pages/beads";
```

Replace beads route:

```tsx
<Route path="/beads" element={<BeadsPage />} />
```

- [ ] **Step 3: Verify the beads page**

Open: `http://localhost:5173/beads`
Expected:
- Table showing all beads (at least hq-6wi and the ephemeral wisps)
- Each row has ID, title, status badge, priority, assignee, updated date
- Labels shown as small tags under title
- Status filter buttons work
- Clicking Priority or Updated column headers sorts the table
- Ephemeral wisps (deacon/witness patrol) appear alongside regular beads

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/
git commit -m "feat(web): add beads page with sortable table and status filters"
```

---

## Task 11: Rigs Page

**Files:**
- Create: `packages/web/src/pages/rigs.tsx`
- Modify: `packages/web/src/App.tsx` — swap placeholder

- [ ] **Step 1: Create packages/web/src/pages/rigs.tsx**

```tsx
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { Rig } from "@/lib/types";
import { Server } from "lucide-react";

export function RigsPage() {
  const { data, loading, error } = useFetch<Rig[]>("/rigs", 10000);

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load rigs: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">Rigs</h2>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-lg bg-[var(--color-card)] animate-pulse"
            />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {data.map((rig) => (
            <div
              key={rig.name}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 hover:bg-[var(--color-card-hover)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-zinc-800 p-2">
                    <Server className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {rig.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      prefix: {rig.beads_prefix}
                    </p>
                  </div>
                </div>
                <StatusBadge status={rig.status} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-md bg-zinc-900 p-2.5 text-center">
                  <p className="text-lg font-semibold text-zinc-100 tabular-nums">
                    {rig.polecats}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                    Polecats
                  </p>
                </div>
                <div className="rounded-md bg-zinc-900 p-2.5 text-center">
                  <p className="text-lg font-semibold text-zinc-100 tabular-nums">
                    {rig.crew}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                    Crew
                  </p>
                </div>
                <div className="rounded-md bg-zinc-900 p-2.5 text-center">
                  <StatusBadge status={rig.witness} />
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
                    Witness
                  </p>
                </div>
              </div>

              <div className="mt-3 flex gap-2 text-xs">
                <span className="text-zinc-500">
                  Refinery:{" "}
                  <span
                    className={
                      rig.refinery === "running"
                        ? "text-emerald-400"
                        : "text-zinc-600"
                    }
                  >
                    {rig.refinery}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-600">No rigs found</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx**

Add import:

```tsx
import { RigsPage } from "@/pages/rigs";
```

Replace rigs route:

```tsx
<Route path="/rigs" element={<RigsPage />} />
```

- [ ] **Step 3: Verify the rigs page**

Open: `http://localhost:5173/rigs`
Expected:
- Card grid showing abhik_portfolio and gastown_dashboard
- Each card has: name, prefix, operational status badge
- Stats: polecats count, crew count, witness status badge
- Refinery status text at bottom
- Cards have hover effect

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/
git commit -m "feat(web): add rigs page with card grid"
```

---

## Task 12: Final Polish + Verification

**Files:**
- No new files. Verification and minor fixes only.

- [ ] **Step 1: Verify full dev startup**

From the repo root:

```bash
pnpm dev
```

Expected: Both server and client start. No errors in terminal. Server logs `[gastown-server] listening on :4800`. Vite shows `http://localhost:5173`.

- [ ] **Step 2: Walk through all pages**

Open `http://localhost:5173` and verify each page:

1. **Overview**: Stat cards, live feed (green dot + scrolling events), rig health panel, scheduler status
2. **Agents**: Table with all agents, role filter buttons, nudge button
3. **Beads**: Table with all beads, status filters, sorting works on Priority and Updated columns
4. **Rigs**: Card grid with real rig data

Verify the status bar at the bottom shows: health dot (green), agent count, rig count, bead count.

- [ ] **Step 3: Verify SSE reconnection**

1. Restart the server (kill and re-run `pnpm --filter @gastown/server dev`)
2. Observe the live feed reconnects (green dot may flicker red then back to green)

- [ ] **Step 4: Verify API proxy**

Open browser dev tools Network tab. Confirm requests go to `/api/*` and are proxied to port 4800 (no CORS errors).

- [ ] **Step 5: Final commit**

If any fixes were needed during verification:

```bash
git add -A
git commit -m "fix: address issues found during v1 verification"
```

---

## Summary

| Task | What it builds | Key files |
|------|---------------|-----------|
| 1 | Monorepo scaffold | package.json, workspace, turbo |
| 2 | CLI runner + cache + parsers | cli.ts, parsers.ts |
| 3 | REST API routes | routes/overview,rigs,agents,beads.ts |
| 4 | SSE live feed | feed.ts |
| 5 | Frontend foundation | types, hooks, Tailwind theme |
| 6 | shadcn/ui + shared components | stat-card, status-badge |
| 7 | App layout | sidebar, topbar, status-bar, routing |
| 8 | Overview page | overview.tsx, live-feed.tsx |
| 9 | Agents page | agents.tsx |
| 10 | Beads page | beads.tsx |
| 11 | Rigs page | rigs.tsx |
| 12 | Verification | Full walkthrough |

12 tasks. Each produces a working commit. After Task 7 you have a navigable shell with live data in the status bar. After Task 8 you have a functional monitoring dashboard. Tasks 9-11 add the remaining v1 pages.
