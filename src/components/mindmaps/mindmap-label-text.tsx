"use client";

import { splitDollarMath } from "@/lib/math/dollar-math";
import { renderLatexToHtml } from "@/lib/math/katex";

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
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder.
        key={index}
        className={segment.display ? "block text-center" : undefined}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX output with trust:false (no links or raw HTML).
        dangerouslySetInnerHTML={{
          __html: renderLatexToHtml(segment.latex, segment.display),
        }}
      />
    ),
  );
}
