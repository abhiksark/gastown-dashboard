export interface Rig {
  name: string;
  beads_prefix: string;
  status: string;
  witness: string;
  refinery: string;
  polecats: number;
  crew: number;
}

export interface Agent {
  name: string;
  role: string;
  rig: string | null;
  icon: string;
}

export interface BeadDependency {
  issue_id: string;
  depends_on_id: string;
  type: string;
  created_at: string;
  created_by: string;
  metadata: string;
}

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
  dependencies?: BeadDependency[];
  dependency_count: number;
  dependent_count: number;
  comment_count: number;
  ephemeral?: boolean;
}

export interface Scheduler {
  paused: boolean;
  queued_total: number;
  queued_ready: number;
  active_polecats: number;
  beads: unknown[] | null;
}

export interface Overview {
  rigs: { total: number; items: Rig[] };
  agents: { total: number; items: Agent[] };
  beads: {
    total: number;
    open: number;
    hooked: number;
    closed: number;
  };
  scheduler: Scheduler;
}

export interface FeedEvent {
  ts: string;
  source: string;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
  visibility: string;
}

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

// From /api/convoys/timeline
export interface TimelineConvoy {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  beads: TimelineBead[];
}

export interface TimelineBead {
  id: string;
  title: string;
  status: string;
  assignee: string;
  created_at: string;
  updated_at: string;
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

// From `gt formula list --json`
export interface Formula {
  name: string;
  type: string;
  description: string;
  source: string;
  steps: number;
  vars: number;
}

// From `gt formula show :name --json`
export interface FormulaDetail extends Formula {
  version: number;
  vars_detail: Record<string, { description: string; required: boolean }>;
  step_list: FormulaStep[];
}

export interface FormulaStep {
  id: string;
  title: string;
  description: string;
  needs?: string[];
}

// From `gt session list --json`
export interface Session {
  rig: string;
  polecat: string;
  session_id: string;
  running: boolean;
}

// From `gt polecat list :rig --json` / `gt polecat status :rig/:name --json`
export interface PolecatStatus {
  name: string;
  rig: string;
  state: string;
  issue: string | null;
  session_running: boolean;
  created_at?: string;
  last_activity?: string;
}

// From `gt witness status :rig --json`
export interface WitnessStatus {
  running: boolean;
  rig_name: string;
  session: string;
}

// From `gt costs --json`
export interface CostEntry {
  session: string;
  role: string;
  rig: string;
  worker?: string;
  cost_usd: number;
  running: boolean;
}

export interface CostSummary {
  total_usd: number;
  sessions?: CostEntry[];
  by_rig?: Record<string, number>;
  by_role?: Record<string, number>;
  period?: string;
}

// From /api/anomalies
export interface Anomaly {
  id: string;
  type: "stuck_agent" | "high_error_rate" | "zombie_session" | "overloaded_rig";
  severity: "critical" | "high" | "medium";
  description: string;
  affected: string;
  detected_at: string;
  suggested_action: string;
}

// From /api/anomalies/heatmap
export interface HeatmapDay {
  date: string;
  count: number;
}

// From `gt dog list --json`
export interface Dog {
  name: string;
  state: string;
  last_active: string;
  worktrees: Record<string, string>;
}

// From `gt dog health-check --json`
export interface DogHealthCheck {
  dogs: DogHealth[];
  needs_attention: number;
}

export interface DogHealth {
  name: string;
  state: string;
  session_status: string;
  needs_attention: boolean;
}

// From `gt patrol scan --json`
export interface PatrolScan {
  rig: string;
  timestamp: string;
  zombies: { checked: number; found: number };
  stalls: {
    checked: number;
    found: number;
    stalls?: Array<{
      polecat: string;
      stall_type: string;
      action: string;
    }>;
  };
  completions: { checked: number; found: number };
}

// Patrol events from .events.jsonl (filtered)
export interface PatrolEvent {
  ts: string;
  source: string;
  type: string;
  actor: string;
  payload: {
    subject?: string;
    topic?: string;
    [key: string]: unknown;
  };
  visibility: string;
}

// From `gt mountain status --json`
export interface Mountain {
  id: string;
  title: string;
  status: string;
  total: number;
  done: number;
  active: number;
  blocked: number;
  pending: number;
  skipped: number;
  current_wave: number;
  total_waves: number;
  last_progress: string;
  created_at: string;
  updated_at: string;
  waves?: MountainWave[];
}

export interface MountainWave {
  wave: number;
  status: string;
  beads: MountainBead[];
}

export interface MountainBead {
  id: string;
  title: string;
  status: string;
  assignee: string;
}

// From gh pr list --json
export interface PullRequest {
  number: number;
  title: string;
  state: string;
  author: { login: string };
  createdAt: string;
  headRefName: string;
  url: string;
  labels: { name: string }[];
  isDraft: boolean;
}

// From `gt mol current --json`
export interface MoleculeStatus {
  identity: string;
  steps_complete: number;
  steps_total: number;
  status: string;
  formula?: string;
  bead?: string;
}
