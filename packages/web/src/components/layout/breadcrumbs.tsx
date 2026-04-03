import { Link, useLocation } from "react-router";
import { ChevronRight } from "lucide-react";

const segmentLabels: Record<string, string> = {
  agents: "Agents",
  sessions: "Sessions",
  beads: "Beads",
  rigs: "Rigs",
  convoys: "Convoys",
  refinery: "Refinery",
  escalations: "Escalations",
  mail: "Mail",
  workflows: "Workflows",
  feed: "Feed",
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; to: string }[] = [
    { label: "Gas Town", to: "/" },
  ];

  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    crumbs.push({
      label: segmentLabels[seg] ?? seg,
      to: path,
    });
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.to} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 text-zinc-600" />}
            {isLast ? (
              <span className="text-zinc-200 font-medium">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.to}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
