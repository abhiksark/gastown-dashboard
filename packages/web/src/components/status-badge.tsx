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
  workflow: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  convoy: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  expansion: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  aspect: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  naked: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  empty: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = variants[status] || variants.stopped;
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", variant, className)}>
      {status}
    </span>
  );
}
