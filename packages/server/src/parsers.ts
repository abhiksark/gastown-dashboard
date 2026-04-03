export function parseAgentsList(text: string): Array<{
  name: string;
  role: string;
  rig: string | null;
  icon: string;
}> {
  const lines = text.split("\n").filter((l) => l.trim());
  const agents: Array<{
    name: string;
    role: string;
    rig: string | null;
    icon: string;
  }> = [];
  let currentRig: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const rigMatch = trimmed.match(/^──\s+(.+?)\s+──$/);
    if (rigMatch) {
      currentRig = rigMatch[1];
      continue;
    }

    const agentMatch = trimmed.match(/^(\S+)\s+(.+)$/);
    if (agentMatch) {
      const icon = agentMatch[1];
      const name = agentMatch[2];
      const role = iconToRole(icon);
      agents.push({ name, role, rig: currentRig, icon });
    }
  }
  return agents;
}

function iconToRole(icon: string): string {
  const map: Record<string, string> = {
    "\u{1F3A9}": "mayor",
    "\u{1F43A}": "deacon",
    "\u{1F989}": "witness",
    "\u{1F477}": "crew",
    "\u{1F63A}": "polecat",
  };
  return map[icon] || "unknown";
}

export function parseFeedLines(
  text: string
): Array<{ time: string; actor: string; event: string }> {
  const lines = text.split("\n").filter((l) => l.trim());
  return lines.map((line) => {
    const match = line.match(/^\[([^\]]+)\]\s+\S+\s+(\S+)\s+(.+)$/);
    if (!match) return { time: "", actor: "", event: line.trim() };
    return { time: match[1], actor: match[2].trim(), event: match[3].trim() };
  });
}
