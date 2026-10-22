import {
  MINDMAP_NODE_COLOR_TOKENS,
  type MindmapNodeColor,
} from "@/features/mindmaps/constants";

export interface NodeColorSwatch {
  token: MindmapNodeColor;
  hue: string;
}

// Hue-wheel bounds (degrees, exclusive upper) for plain color names.
const HUE_NAMES: [number, string][] = [
  [15, "red"],
  [45, "orange"],
  [70, "yellow"],
  [165, "green"],
  [200, "teal"],
  [255, "blue"],
  [290, "purple"],
  [345, "pink"],
  [360, "red"],
];

/**
 * Name the hue of an sRGB color so the assistant can map "purple" to a slot.
 *
 * @example
 * describeHue(128, 0, 128); // "purple"
 */
export function describeHue(red: number, green: number, blue: number): string {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const chroma = max - min;
  if (chroma < 24) return "gray";
  const hue = rgbHueDegrees(red, green, blue, max, chroma);
  return HUE_NAMES.find(([bound]) => hue < bound)?.[1] ?? "red";
}

function rgbHueDegrees(
  red: number,
  green: number,
  blue: number,
  max: number,
  chroma: number,
): number {
  const sector =
    max === red
      ? (green - blue) / chroma
      : max === green
        ? (blue - red) / chroma + 2
        : (red - green) / chroma + 4;
  return (sector * 60 + 360) % 360;
}

/**
 * The node color slots as they render in the active theme. Slots are theme
 * variables, so the same token is orange in one theme and blue in another.
 * Returns an empty list where canvas is unavailable (tests, old browsers).
 *
 * @example
 * readNodeColorPalette(); // [{token: "chart-1", hue: "orange"}, ...]
 */
export function readNodeColorPalette(): NodeColorSwatch[] {
  const context = document.createElement("canvas").getContext("2d", {
    willReadFrequently: true,
  });
  if (!context) return [];
  const styles = getComputedStyle(document.documentElement);
  return MINDMAP_NODE_COLOR_TOKENS.flatMap((token) => {
    const value = styles.getPropertyValue(`--${token}`).trim();
    if (!value) return [];
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
    return [{ token, hue: describeHue(red, green, blue) }];
  });
}
