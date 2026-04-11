import { useRef, useEffect, useCallback, useState } from "react";
import * as d3 from "d3";
import { Maximize2 } from "lucide-react";

interface GraphNode {
  id: string;
  title: string;
  status: string;
  priority: number;
  issue_type: string;
}

interface GraphEdge {
  from: string;
  to: string;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectBead: (id: string) => void;
  selectedId?: string;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  status: string;
  priority: number;
  issue_type: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string;
  target: SimNode | string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "#f59e0b",
  hooked: "#3b82f6",
  in_progress: "#8b5cf6",
  blocked: "#ef4444",
  closed: "#22c55e",
  deferred: "#6b7280",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#71717a";
}

function nodeRadius(priority: number): number {
  if (priority === 0) return 14;
  if (priority === 1) return 12;
  if (priority === 2) return 10;
  return 8;
}

export function DependencyGraph({ nodes, edges, onSelectBead, selectedId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const prevDataRef = useRef<string>("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const render = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Skip re-render if data hasn't changed (prevents simulation reset on poll)
    const dataKey = JSON.stringify({ n: nodes.map(n => n.id + n.status), e: edges.map(e => e.from + e.to) });
    if (dataKey === prevDataRef.current) {
      // Just update selection highlight
      d3.select(svg).selectAll<SVGCircleElement, SimNode>("circle")
        .attr("stroke", (d) => d.id === selectedId ? "#fff" : "transparent")
        .attr("stroke-width", (d) => d.id === selectedId ? 2.5 : 0);
      return;
    }
    prevDataRef.current = dataKey;

    const rect = svg.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    if (simRef.current) {
      simRef.current.stop();
      simRef.current = null;
    }

    const sel = d3.select(svg);
    sel.selectAll("*").remove();

    if (nodes.length === 0) return;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const validEdges = edges.filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to));
    const hasEdges = validEdges.length > 0;

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simLinks: SimLink[] = validEdges.map((e) => ({
      source: e.from,
      target: e.to,
    }));

    // If no edges, use a clustered layout grouped by status
    if (!hasEdges) {
      const statusGroups: Record<string, SimNode[]> = {};
      for (const n of simNodes) {
        const s = n.status;
        if (!statusGroups[s]) statusGroups[s] = [];
        statusGroups[s].push(n);
      }
      const groupNames = Object.keys(statusGroups);
      const groupWidth = width / (groupNames.length + 1);

      groupNames.forEach((status, gi) => {
        const group = statusGroups[status];
        const cx = groupWidth * (gi + 1);
        const rows = Math.ceil(Math.sqrt(group.length));
        group.forEach((n, ni) => {
          const row = Math.floor(ni / rows);
          const col = ni % rows;
          n.x = cx + (col - rows / 2) * 35;
          n.y = height * 0.3 + row * 35;
        });
      });
    }

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        hasEdges
          ? d3.forceLink<SimNode, SimLink>(simLinks).id((d) => d.id).distance(120)
          : null
      )
      .force("charge", d3.forceManyBody().strength(hasEdges ? -300 : -50))
      .force("center", hasEdges ? d3.forceCenter(width / 2, height / 2) : null)
      .force("collision", d3.forceCollide(hasEdges ? 30 : 20))
      .alphaDecay(hasEdges ? 0.0228 : 0.05); // faster settle for clustered

    simRef.current = simulation;

    const g = sel.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    sel.call(zoom);

    // Arrow marker
    g.append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#52525b");

    // Status group labels (for clustered layout)
    if (!hasEdges) {
      const statusGroups: Record<string, SimNode[]> = {};
      for (const n of simNodes) {
        if (!statusGroups[n.status]) statusGroups[n.status] = [];
        statusGroups[n.status].push(n);
      }
      const groupNames = Object.keys(statusGroups);
      const groupWidth = width / (groupNames.length + 1);

      g.selectAll<SVGTextElement, string>(".group-label")
        .data(groupNames)
        .join("text")
        .attr("class", "group-label")
        .attr("x", (_, i) => groupWidth * (i + 1))
        .attr("y", height * 0.15)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("text-transform", "uppercase")
        .attr("letter-spacing", "0.05em")
        .attr("fill", (d) => statusColor(d))
        .attr("opacity", 0.7)
        .text((d) => `${d} (${statusGroups[d].length})`);
    }

    // Edges
    const link = g
      .append("g")
      .selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "#52525b")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)");

    // Node groups
    const node = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (_, d) => onSelectBead(d.id))
      .on("mouseenter", (_, d) => setHoveredId(d.id))
      .on("mouseleave", () => setHoveredId(null))
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles — size by priority
    node
      .append("circle")
      .attr("r", (d) => nodeRadius(d.priority))
      .attr("fill", (d) => statusColor(d.status))
      .attr("stroke", (d) => (d.id === selectedId ? "#fff" : "transparent"))
      .attr("stroke-width", (d) => (d.id === selectedId ? 2.5 : 0))
      .attr("opacity", 0.9);

    // Labels — show only bead ID by default, full title on hover handled by tooltip
    node
      .append("text")
      .text((d) => d.id)
      .attr("x", (d) => nodeRadius(d.priority) + 4)
      .attr("y", 3)
      .attr("font-size", "9px")
      .attr("fill", "#71717a")
      .attr("pointer-events", "none")
      .attr("opacity", 0);

    // Show label on hover
    node.on("mouseenter.label", function () {
      d3.select(this).select("text").attr("opacity", 1);
    });
    node.on("mouseleave.label", function () {
      d3.select(this).select("text").attr("opacity", 0);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x!)
        .attr("y1", (d) => (d.source as SimNode).y!)
        .attr("x2", (d) => (d.target as SimNode).x!)
        .attr("y2", (d) => (d.target as SimNode).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
  }, [nodes, edges, onSelectBead, selectedId]);

  useEffect(() => {
    render();
    return () => {
      if (simRef.current) {
        simRef.current.stop();
        simRef.current = null;
      }
    };
  }, [render]);

  function fitToView() {
    const svg = svgRef.current;
    if (!svg || !zoomRef.current) return;
    const sel = d3.select(svg);
    sel.transition().duration(500).call(
      zoomRef.current.transform,
      d3.zoomIdentity
    );
  }

  const legendItems = [
    { status: "open", label: "Open" },
    { status: "hooked", label: "Hooked" },
    { status: "closed", label: "Closed" },
    { status: "blocked", label: "Blocked" },
    { status: "deferred", label: "Deferred" },
  ];

  return (
    <div className="relative rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
      <svg ref={svgRef} className="w-full h-full" />

      {/* Fit to view button */}
      <button
        onClick={fitToView}
        className="absolute top-3 right-3 rounded-md bg-zinc-800/80 p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors backdrop-blur-sm"
        title="Fit to view"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      {/* Hover tooltip */}
      {hoveredId && (() => {
        const n = nodes.find(n => n.id === hoveredId);
        if (!n) return null;
        return (
          <div className="absolute top-3 left-3 rounded-md bg-zinc-900/90 border border-zinc-700 px-3 py-2 backdrop-blur-sm pointer-events-none max-w-xs">
            <p className="font-mono text-[10px] text-zinc-500">{n.id}</p>
            <p className="text-xs text-zinc-200 mt-0.5">{n.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(n.status) }} />
              <span className="text-[10px] text-zinc-400">{n.status}</span>
              <span className="text-[10px] text-zinc-500">P{n.priority}</span>
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3 rounded-md bg-zinc-900/80 px-3 py-2 backdrop-blur-sm">
        {legendItems.map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: statusColor(item.status) }}
            />
            <span className="text-[10px] text-zinc-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Info banner for no-edge mode */}
      {edges.length === 0 && nodes.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-md bg-zinc-900/80 px-3 py-1.5 text-[10px] text-zinc-500 backdrop-blur-sm">
          Grouped by status — add dependencies with <code className="text-zinc-400">bd dep add</code> to see connections
        </div>
      )}

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
          No beads to display
        </div>
      )}
    </div>
  );
}
