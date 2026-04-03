import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { apiFetch, apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Agent, Bead, Rig, Session } from "@/lib/types";
import {
  LayoutDashboard,
  Users,
  CircleDot,
  Server,
  Truck,
  GitMerge,
  AlertTriangle,
  Mail,
  FlaskConical,
  Terminal,
  Play,
  Square,
  RotateCw,
} from "lucide-react";

const pages = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Agents", path: "/agents", icon: Users },
  { label: "Sessions", path: "/sessions", icon: Terminal },
  { label: "Beads", path: "/beads", icon: CircleDot },
  { label: "Rigs", path: "/rigs", icon: Server },
  { label: "Convoys", path: "/convoys", icon: Truck },
  { label: "Refinery", path: "/refinery", icon: GitMerge },
  { label: "Escalations", path: "/escalations", icon: AlertTriangle },
  { label: "Mail", path: "/mail", icon: Mail },
  { label: "Workflows", path: "/workflows", icon: FlaskConical },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [beads, setBeads] = useState<Bead[]>([]);
  const [rigs, setRigs] = useState<Rig[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [a, b, r, s] = await Promise.all([
        apiFetch<Agent[]>("/agents"),
        apiFetch<Bead[]>("/beads"),
        apiFetch<Rig[]>("/rigs"),
        apiFetch<Session[]>("/sessions"),
      ]);
      setAgents(a);
      setBeads(b);
      setRigs(r);
      setSessions(s);
    } catch {
      // silently fail — palette still shows pages
    }
  }, []);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  async function runControl(label: string, url: string) {
    setOpen(false);
    try {
      await apiPost(url);
      addToast(label, "success");
    } catch (err: any) {
      addToast(`Failed: ${err.message}`, "error");
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, agents, beads, rigs..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem key={page.path} onSelect={() => go(page.path)}>
              <page.icon className="mr-2 h-4 w-4 text-zinc-400" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {agents.length > 0 && (
          <CommandGroup heading="Agents">
            {agents.slice(0, 10).map((agent) => (
              <CommandItem
                key={`${agent.rig}-${agent.name}`}
                value={`agent ${agent.name} ${agent.role} ${agent.rig || ""}`}
                onSelect={() => go("/agents")}
              >
                <span className="mr-2">{agent.icon}</span>
                <span>{agent.name}</span>
                <span className="ml-2 text-xs text-zinc-500">{agent.role}</span>
                {agent.rig && (
                  <span className="ml-auto text-xs text-zinc-600">{agent.rig}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {beads.length > 0 && (
          <CommandGroup heading="Beads">
            {beads.slice(0, 15).map((bead) => (
              <CommandItem
                key={bead.id}
                value={`bead ${bead.id} ${bead.title} ${bead.status}`}
                onSelect={() => go("/beads")}
              >
                <CircleDot className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                <span className="font-mono text-xs text-zinc-500 mr-2">{bead.id}</span>
                <span className="truncate">{bead.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {rigs.length > 0 && (
          <CommandGroup heading="Rigs">
            {rigs.map((rig) => (
              <CommandItem
                key={rig.name}
                value={`rig ${rig.name}`}
                onSelect={() => go(`/rigs/${rig.name}`)}
              >
                <Server className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                <span>{rig.name}</span>
                <span className="ml-auto text-xs text-zinc-500">
                  {rig.polecats} polecats · {rig.crew} crew
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {rigs.length > 0 && (
          <CommandGroup heading="Control">
            {rigs.map((rig) => (
              <CommandItem
                key={`start-witness-${rig.name}`}
                value={`control start witness ${rig.name}`}
                onSelect={() => runControl(`Started witness for ${rig.name}`, `/control/witness/${encodeURIComponent(rig.name)}/start`)}
              >
                <Play className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                Start witness for {rig.name}
              </CommandItem>
            ))}
            {rigs.map((rig) => (
              <CommandItem
                key={`stop-witness-${rig.name}`}
                value={`control stop witness ${rig.name}`}
                onSelect={() => runControl(`Stopped witness for ${rig.name}`, `/control/witness/${encodeURIComponent(rig.name)}/stop`)}
              >
                <Square className="mr-2 h-3.5 w-3.5 text-red-400" />
                Stop witness for {rig.name}
              </CommandItem>
            ))}
            {sessions.map((s) => (
              <CommandItem
                key={`restart-session-${s.rig}-${s.polecat}`}
                value={`control restart session ${s.polecat} ${s.rig}`}
                onSelect={() => runControl(`Restarted ${s.polecat}`, `/control/session/${encodeURIComponent(s.rig)}/${encodeURIComponent(s.polecat)}/restart`)}
              >
                <RotateCw className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                Restart session {s.polecat}
                <span className="ml-auto text-xs text-zinc-600">{s.rig}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
