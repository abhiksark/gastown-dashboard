import { useState } from "react";
import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import { useFetch } from "@/hooks/use-fetch";
import { LayoutDashboard, Users, Terminal, CircleDot, Server, Truck, GitMerge, AlertTriangle, Mail, FlaskConical, Activity, PanelLeftClose, PanelLeft } from "lucide-react";
import type { Escalation } from "@/lib/types";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data: escalations } = useFetch<Escalation[]>("/escalations", 30000);

  const openEscalationCount = escalations
    ? escalations.filter((e) => e.status === "open").length
    : 0;

  const navGroups: NavGroup[] = [
    {
      label: "Observe",
      items: [
        { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/feed", label: "Feed", icon: Activity },
        { to: "/escalations", label: "Escalations", icon: AlertTriangle, badge: openEscalationCount },
      ],
    },
    {
      label: "Work",
      items: [
        { to: "/beads", label: "Beads", icon: CircleDot },
        { to: "/agents", label: "Agents", icon: Users },
        { to: "/sessions", label: "Sessions", icon: Terminal },
        { to: "/convoys", label: "Convoys", icon: Truck },
      ],
    },
    {
      label: "System",
      items: [
        { to: "/rigs", label: "Rigs", icon: Server },
        { to: "/refinery", label: "Refinery", icon: GitMerge },
        { to: "/workflows", label: "Workflows", icon: FlaskConical },
        { to: "/mail", label: "Mail", icon: Mail },
      ],
    },
  ];

  return (
    <aside className={cn(
      "flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]",
      "transition-[width] duration-200",
      collapsed ? "w-16" : "w-56"
    )}>
      <div className="flex items-center h-12 px-4 border-b border-[var(--color-border)]">
        {!collapsed && (
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">Gas Town</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors",
            collapsed ? "mx-auto" : "ml-auto"
          )}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 py-1 px-2">
        {navGroups.map((group) => (
          <div key={group.label} className="pt-4">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {group.label}
              </div>
            )}
            {collapsed && <div className="pt-4 first:pt-0" />}
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span>{label}</span>
                      {badge != null && badge > 0 && (
                        <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
