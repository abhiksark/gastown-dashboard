import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5",
      "hover:bg-[var(--color-card-hover)] transition-colors",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-zinc-100 tabular-nums">{value}</span>
        {trend && trend !== "neutral" && (
          <span className={cn("text-xs font-medium", trend === "up" ? "text-[var(--color-success)]" : "text-[var(--color-error)]")}>
            {trend === "up" ? "\u2191" : "\u2193"}
          </span>
        )}
      </div>
    </div>
  );
}
