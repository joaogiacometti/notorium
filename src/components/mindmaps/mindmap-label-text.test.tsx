import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MindmapLabelText } from "@/components/mindmaps/mindmap-label-text";

describe("MindmapLabelText", () => {
  it("renders dollar math with KaTeX and keeps prose literal", () => {
    const html = renderToStaticMarkup(
      <MindmapLabelText label="Area: $A = \frac{1}{2}bh$ costs $5$" />,
    );
    expect(html).toContain('class="katex"');
    expect(html).toContain("<span>Area: </span>");
    expect(html).toContain("costs $5$");
    expect(html).not.toContain("$A");
  });
});
