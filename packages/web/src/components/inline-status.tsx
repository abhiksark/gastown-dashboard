import { cn } from "@/lib/utils";

const dotColors: Record<string, string> = {
  running: "bg-emerald-500",
  operational: "bg-emerald-500",
  completed: "bg-emerald-500",
  done: "bg-emerald-500",
  ready: "bg-emerald-500",
  resolved: "bg-emerald-500",
  hooked: "bg-blue-500",
  in_progress: "bg-blue-500",
  active: "bg-blue-500",
  acknowledged: "bg-blue-500",
  open: "bg-amber-500",
  paused: "bg-amber-500",
  stopped: "bg-zinc-500",
  closed: "bg-zinc-500",
  empty: "bg-zinc-500",
  failed: "bg-red-500",
  blocked: "bg-red-500",
  critical: "bg-red-500",
};

const textColors: Record<string, string> = {
  running: "text-emerald-400",
  operational: "text-emerald-400",
  completed: "text-emerald-400",
  done: "text-emerald-400",
  ready: "text-emerald-400",
  resolved: "text-emerald-400",
  hooked: "text-blue-400",
  in_progress: "text-blue-400",
  active: "text-blue-400",
  acknowledged: "text-blue-400",
  open: "text-amber-400",
  paused: "text-amber-400",
  stopped: "text-zinc-400",
  closed: "text-zinc-400",
  empty: "text-zinc-400",
  failed: "text-red-400",
  blocked: "text-red-400",
  critical: "text-red-400",
};

interface InlineStatusProps {
  status: string;
  className?: string;
}

export function InlineStatus({ status, className }: InlineStatusProps) {
  const dot = dotColors[status] || "bg-zinc-500";
  const text = textColors[status] || "text-zinc-400";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
      <span className={text}>{status}</span>
    </span>
  );
}
