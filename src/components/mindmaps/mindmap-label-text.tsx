"use client";

import { KatexHtml } from "@/components/shared/katex-html";
import { splitDollarMath } from "@/lib/math/dollar-math";

interface MindmapLabelTextProps {
  label: string;
}

/**
 * A node label with `$...$` math rendered by KaTeX; other text stays literal.
 * The raw label remains the edit and search source.
 *
 * @example
 * <MindmapLabelText label="Area: $A = \\frac{1}{2}bh$" />
 */
export function MindmapLabelText({ label }: Readonly<MindmapLabelTextProps>) {
  return splitDollarMath(label).map((segment, index) =>
    segment.kind === "text" ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder.
      <span key={index}>{segment.text}</span>
    ) : (
      <KatexHtml
        // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder.
        key={index}
        latex={segment.latex}
        display={segment.display}
        className={segment.display ? "block text-center" : undefined}
      />
    ),
  );
}
