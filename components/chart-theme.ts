// Shared Recharts styling so every chart has the same recessive chrome:
// muted axis text, hairline grid, and tooltips whose text stays in ink
// colors (the series color lives on the mark, never on the text).

import type { CSSProperties } from "react";

export const axisTick = { fontSize: 11, fill: "var(--text-muted)" };

export const tooltipContentStyle: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border-hairline)",
  borderRadius: 10,
  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.10)",
  fontSize: 12,
  padding: "8px 10px",
};

export const tooltipLabelStyle: CSSProperties = {
  color: "var(--text-secondary)",
  marginBottom: 2,
};

export const tooltipItemStyle: CSSProperties = {
  color: "var(--text-primary)",
  fontWeight: 600,
  padding: 0,
};

export const lineCursor = { stroke: "var(--baseline)", strokeWidth: 1 };

export const barCursor = { fill: "var(--gridline)", fillOpacity: 0.45 };

/** 8px end-dot with a 2px surface ring so it stays legible where it crosses the line. */
export function dotStyle(color: string, r = 4) {
  return { r, fill: color, stroke: "var(--surface-1)", strokeWidth: 2 };
}
