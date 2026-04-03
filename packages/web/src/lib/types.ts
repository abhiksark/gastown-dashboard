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
    in_progress: number;
    completed: number;
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
