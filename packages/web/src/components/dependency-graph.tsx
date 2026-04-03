import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

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
  open: "#f59e0b",       // amber
  hooked: "#3b82f6",     // blue
  in_progress: "#8b5cf6", // violet
  blocked: "#ef4444",    // red
  closed: "#22c55e",     // green
  deferred: "#6b7280",   // gray
  pinned: "#ec4899",     // pink
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#71717a";
}

export function DependencyGraph({ nodes, edges, onSelectBead, selectedId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  const render = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    // Clean up previous simulation
    if (simRef.current) {
      simRef.current.stop();
      simRef.current = null;
    }

    const sel = d3.select(svg);
    sel.selectAll("*").remove();

    if (nodes.length === 0) return;

    // Build node map and filter edges to only valid nodes
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const validEdges = edges.filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to));

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simLinks: SimLink[] = validEdges.map((e) => ({
      source: e.from,
      target: e.to,
    }));

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(30));

    simRef.current = simulation;

    // Zoom container
    const g = sel.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

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

    // Node circles
    node
      .append("circle")
      .attr("r", 10)
      .attr("fill", (d) => statusColor(d.status))
      .attr("stroke", (d) => (d.id === selectedId ? "#fff" : "transparent"))
      .attr("stroke-width", 2)
      .attr("opacity", 0.9);

    // Node labels
    node
      .append("text")
      .text((d) => {
        const label = d.title.length > 30 ? d.title.slice(0, 28) + "\u2026" : d.title;
        return label;
      })
      .attr("x", 14)
      .attr("y", 4)
      .attr("font-size", "10px")
      .attr("fill", "#a1a1aa")
      .attr("pointer-events", "none");

    // Tooltip on hover
    node
      .append("title")
      .text((d) => `${d.id}: ${d.title}\nStatus: ${d.status}\nPriority: P${d.priority}`);

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

  // Legend
  const legendItems = [
    { status: "open", label: "Open" },
    { status: "hooked", label: "Hooked" },
    { status: "in_progress", label: "In Progress" },
    { status: "closed", label: "Closed" },
    { status: "blocked", label: "Blocked" },
  ];

  return (
    <div className="relative rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
      <svg ref={svgRef} className="w-full h-full" />
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
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
          No beads to display
        </div>
      )}
    </div>
  );
}
