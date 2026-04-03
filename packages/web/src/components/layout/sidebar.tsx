import { useState } from "react";
import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, CircleDot, Server, Truck, GitMerge, AlertTriangle, Mail, FlaskConical, PanelLeftClose, PanelLeft } from "lucide-react";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/agents", label: "Agents", icon: Users },
  { to: "/beads", label: "Beads", icon: CircleDot },
  { to: "/rigs", label: "Rigs", icon: Server },
  { to: "/convoys", label: "Convoys", icon: Truck },
  { to: "/refinery", label: "Refinery", icon: GitMerge },
  { to: "/escalations", label: "Escalations", icon: AlertTriangle },
  { to: "/mail", label: "Mail", icon: Mail },
  { to: "/workflows", label: "Workflows", icon: FlaskConical },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]",
      "transition-[width] duration-200",
      collapsed ? "w-16" : "w-56"
    )}>
      <div className="flex items-center h-14 px-4 border-b border-[var(--color-border)]">
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
      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-blue-500/5 text-zinc-100 border-l-2 border-[var(--color-accent)]" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border-l-2 border-transparent"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
