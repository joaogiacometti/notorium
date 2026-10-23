import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KatexHtml } from "@/components/shared/katex-html";

describe("KatexHtml", () => {
  it("renders inline and display math", () => {
    expect(
      renderToStaticMarkup(<KatexHtml latex="x^2" display={false} />),
    ).toContain('class="katex"');
    expect(
      renderToStaticMarkup(<KatexHtml latex="x^2" display={true} />),
    ).toContain("katex-display");
  });

  it("does not render links or raw HTML from untrusted LaTeX", () => {
    const html = renderToStaticMarkup(
      <KatexHtml
        latex="\href{javascript:alert(1)}{x} \url{https://x.test} \htmlClass{evil}{y}"
        display={false}
      />,
    );

    expect(html).not.toMatch(/<a\s/);
    expect(html).not.toContain('class="evil"');
  });
});
