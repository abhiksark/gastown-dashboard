import { Router } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const exec = promisify(execFile);
const GT_HOME = process.env.GT_HOME || path.join(homedir(), "gt");

const GH_FIELDS = "number,title,state,author,createdAt,headRefName,url,labels,isDraft";

interface RigConfig {
  name: string;
  git_url: string;
}

// Cache rig→GitHub repo mapping
let repoMapCache: Record<string, string | null> | null = null;
let repoMapExpiry = 0;

async function getRepoMap(): Promise<Record<string, string | null>> {
  const now = Date.now();
  if (repoMapCache && now < repoMapExpiry) return repoMapCache;

  const map: Record<string, string | null> = {};

  // Read rig configs to get git_urls
  try {
    const { stdout } = await exec("gt", ["rig", "list", "--json"], {
      timeout: 10000,
      cwd: GT_HOME,
      env: { ...process.env, NO_COLOR: "1" },
    });
    const rigs = JSON.parse(stdout.substring(stdout.indexOf("[")));
    for (const rig of rigs) {
      const rigName = rig.name;
      const configPath = path.join(GT_HOME, rigName, "config.json");
      try {
        const config: RigConfig = JSON.parse(await readFile(configPath, "utf-8"));
        const ghRepo = await resolveGitHubRepo(config.git_url);
        map[rigName] = ghRepo;
      } catch {
        map[rigName] = null;
      }
    }
  } catch {
    // fallback empty
  }

  repoMapCache = map;
  repoMapExpiry = now + 60000; // cache 1 minute
  return map;
}

async function resolveGitHubRepo(gitUrl: string): Promise<string | null> {
  if (!gitUrl) return null;

  // If already a GitHub URL
  const ghMatch = gitUrl.match(/github\.com[:/]([^/]+\/[^/.]+)/);
  if (ghMatch) return ghMatch[1];

  // If file:// URL, resolve to local path and get remote
  if (gitUrl.startsWith("file://")) {
    const localPath = gitUrl.replace("file://", "");
    try {
      const { stdout } = await exec("git", ["remote", "get-url", "origin"], {
        cwd: localPath,
        timeout: 5000,
      });
      const remoteMatch = stdout.trim().match(/github\.com[:/]([^/]+\/[^/.]+)/);
      return remoteMatch ? remoteMatch[1] : null;
    } catch {
      return null;
    }
  }

  return null;
}

async function fetchPRs(repo: string): Promise<unknown[]> {
  try {
    const { stdout } = await exec(
      "gh",
      ["pr", "list", "--repo", repo, "--state", "all", "--json", GH_FIELDS, "--limit", "20"],
      { timeout: 15000, env: { ...process.env, NO_COLOR: "1" } }
    );
    return JSON.parse(stdout);
  } catch {
    return [];
  }
}

const router = Router();

// GET /api/prs — PRs for all rigs
router.get("/", async (_req, res) => {
  try {
    const repoMap = await getRepoMap();
    const result: Record<string, unknown[] | string> = {};

    await Promise.all(
      Object.entries(repoMap).map(async ([rig, repo]) => {
        if (!repo) {
          result[rig] = "local";
          return;
        }
        result[rig] = await fetchPRs(repo);
      })
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prs/:rig — PRs for a specific rig
router.get("/:rig", async (req, res) => {
  try {
    const repoMap = await getRepoMap();
    const repo = repoMap[req.params.rig];
    if (repo === undefined) {
      res.status(404).json({ error: "Rig not found" });
      return;
    }
    if (!repo) {
      res.json({ rig: req.params.rig, prs: [], local: true });
      return;
    }
    const prs = await fetchPRs(repo);
    res.json({ rig: req.params.rig, prs, repo });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
