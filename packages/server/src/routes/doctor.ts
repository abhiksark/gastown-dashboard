import { Router } from "express";
import { runAction } from "../cli.js";

const router = Router();

interface DoctorCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  fixable: boolean;
  details?: string[];
}

function parseDoctorOutput(output: string): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const lines = output.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match: ○  check-name...  ✓/✖/⚠  check-name message
    const match = line.match(/○\s+(\S+)\.\.\.\s+(✓|✖|⚠)\s+\S+\s+(.*)/);
    if (match) {
      const [, name, icon, message] = match;
      const status = icon === "✓" ? "pass" : icon === "✖" ? "fail" : "warn";
      checks.push({ name, status, message: message.trim(), fixable: false, details: [] });
    }
  }

  // Parse the WARNINGS and ERRORS sections for fix hints and details
  const fixablePattern = /Run 'gt doctor --fix/;
  let currentSection: "warnings" | "errors" | null = null;
  let currentCheckIdx = -1;

  for (const line of lines) {
    if (line.includes("WARNINGS")) { currentSection = "warnings"; continue; }
    if (line.includes("ERRORS")) { currentSection = "errors"; continue; }
    if (!currentSection) continue;

    // Match numbered items: ⚠  N. check-name: message or ✖  N. check-name: message
    const itemMatch = line.match(/[⚠✖]\s+\d+\.\s+(\S+):\s+(.*)/);
    if (itemMatch) {
      const [, checkName] = itemMatch;
      currentCheckIdx = checks.findIndex((c) => c.name === checkName);
      continue;
    }

    // Detail/fix lines start with └─
    if (line.includes("└─") && currentCheckIdx >= 0) {
      const detail = line.replace(/.*└─\s*/, "").trim();
      if (fixablePattern.test(detail)) {
        checks[currentCheckIdx].fixable = true;
      }
      if (detail.startsWith("Run:") || detail.startsWith("Run '")) {
        checks[currentCheckIdx].fixable = true;
      }
      checks[currentCheckIdx].details!.push(detail);
    }
  }

  return checks;
}

// GET /api/doctor — run doctor and return structured checks
router.get("/", async (_req, res) => {
  try {
    const result = await runAction("gt", ["doctor", "--verbose"]);
    const checks = parseDoctorOutput(result.stdout + "\n" + result.stderr);
    const pass = checks.filter((c) => c.status === "pass").length;
    const fail = checks.filter((c) => c.status === "fail").length;
    const warn = checks.filter((c) => c.status === "warn").length;
    res.json({ checks, summary: { total: checks.length, pass, fail, warn } });
  } catch (err: any) {
    // gt doctor exits non-zero when there are errors — still parse the output
    const output = err.stderr || err.stdout || err.message || "";
    const checks = parseDoctorOutput(output);
    if (checks.length > 0) {
      const pass = checks.filter((c) => c.status === "pass").length;
      const fail = checks.filter((c) => c.status === "fail").length;
      const warn = checks.filter((c) => c.status === "warn").length;
      res.json({ checks, summary: { total: checks.length, pass, fail, warn } });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// POST /api/doctor/fix — auto-fix fixable issues
router.post("/fix", async (_req, res) => {
  try {
    const result = await runAction("gt", ["doctor", "--fix", "--no-start"]);
    res.json({ ok: true, output: result.stdout + (result.stderr ? "\n" + result.stderr : "") });
  } catch (err: any) {
    // --fix may also exit non-zero but still fix things
    res.json({ ok: true, output: err.stderr || err.stdout || err.message });
  }
});

export default router;
