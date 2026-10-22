import type { CSSProperties } from "react";
import type { MindmapNodeColor } from "@/features/mindmaps/constants";

/**
 * Border and background tint for a node color token, shared by the live node
 * and the assistant review preview so both read as the same color.
 *
 * @example
 * <div style={mindmapNodeTint("chart-2")} />
 */
export function mindmapNodeTint(
  color: MindmapNodeColor | undefined,
): CSSProperties {
  if (!color) return { borderColor: "var(--border)" };
  const colorVar = `var(--${color})`;
  return {
    borderColor: colorVar,
    background: `color-mix(in oklab, ${colorVar} 12%, var(--card))`,
  };
}
