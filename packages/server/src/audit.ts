import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { Request, Response, NextFunction } from "express";

const GT_HOME = process.env.GT_HOME || path.join(homedir(), "gt");
const AUDIT_FILE = path.join(GT_HOME, ".dashboard-audit.jsonl");

export interface AuditEntry {
  ts: string;
  action: string;
  endpoint: string;
  method: string;
  params: Record<string, string>;
  body: unknown;
  status: number;
  user: string;
}

/**
 * Express middleware that logs all POST/DELETE requests to a JSONL audit file.
 * Captures the response status code by monkey-patching res.json.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    next();
    return;
  }

  const entry: AuditEntry = {
    ts: new Date().toISOString(),
    action: deriveAction(req.path),
    endpoint: req.originalUrl,
    method: req.method,
    params: req.params as Record<string, string>,
    body: req.body,
    status: 0,
    user: "dashboard",
  };

  // Capture status from response
  const origJson = res.json.bind(res);
  res.json = function (data: unknown) {
    entry.status = res.statusCode;
    appendFile(AUDIT_FILE, JSON.stringify(entry) + "\n").catch(() => {});
    return origJson(data);
  };

  next();
}

function deriveAction(urlPath: string): string {
  // Extract meaningful action from URL path
  // e.g. /api/actions/beads/create → beads/create
  //      /api/control/witness/myrig/start → witness/start
  const stripped = urlPath.replace(/^\/api\//, "");
  return stripped;
}

/**
 * Read audit entries from the JSONL file.
 */
export async function readAuditLog(opts?: {
  limit?: number;
  action?: string;
}): Promise<AuditEntry[]> {
  const limit = opts?.limit ?? 200;
  const actionFilter = opts?.action;

  let content: string;
  try {
    content = await readFile(AUDIT_FILE, "utf-8");
  } catch {
    return [];
  }

  const lines = content.trim().split("\n").filter(Boolean);
  let entries: AuditEntry[] = [];

  // Parse from end (most recent first)
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]) as AuditEntry;
      if (actionFilter && !entry.action.includes(actionFilter)) continue;
      entries.push(entry);
      if (entries.length >= limit) break;
    } catch {
      // skip malformed lines
    }
  }

  return entries;
}
