import type { CSSProperties } from "react";

/* ── Tooltip ─────────────────────────────────────────────── */

const tooltipContentStyle: CSSProperties = {
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: 8,
};

const tooltipLabelStyle: CSSProperties = { color: "#e4e4e7" };

/** Standard dark tooltip — use for bar / pie / simple charts. */
export const chartTooltip = {
  contentStyle: tooltipContentStyle,
  labelStyle: tooltipLabelStyle,
} as const;

/** Elevated tooltip with shadow — use for area / trend charts. */
export const chartTooltipElevated = {
  contentStyle: {
    ...tooltipContentStyle,
    border: "1px solid #27272a",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  } satisfies CSSProperties,
  labelStyle: { color: "#a1a1aa", fontSize: 11 } satisfies CSSProperties,
  itemStyle: { color: "#e4e4e7", fontSize: 12 } satisfies CSSProperties,
} as const;

/* ── CartesianGrid ───────────────────────────────────────── */

/** Default dashed grid. */
export const chartGrid = {
  strokeDasharray: "3 3",
  stroke: "#27272a",
} as const;

/** Subtle horizontal-only grid for area / trend charts. */
export const chartGridClean = {
  stroke: "#1c1c1c",
  vertical: false,
  strokeDasharray: "0",
} as const;

/* ── Axis tick ───────────────────────────────────────────── */

/** Standard muted tick style. */
export const chartAxisTick = {
  fill: "#71717a",
  fontSize: 11,
} as const;

/** Dimmer tick with Inter font — use for area / trend charts. */
export const chartAxisClean = {
  tick: { fill: "#52525b", fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif" } as const,
  tickLine: false as const,
  axisLine: false as const,
};
