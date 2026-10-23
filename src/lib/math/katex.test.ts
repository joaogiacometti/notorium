import { describe, expect, it } from "vitest";
import { renderLatexToHtml } from "@/lib/math/katex";

describe("renderLatexToHtml", () => {
  it("renders inline and display math", () => {
    expect(renderLatexToHtml("x^2", false)).toContain('class="katex"');
    expect(renderLatexToHtml("x^2", true)).toContain("katex-display");
  });

  it("does not render untrusted links", () => {
    expect(
      renderLatexToHtml("\\href{javascript:alert(1)}{x}", false),
    ).not.toMatch(/<a\s/);
  });

  it("caps oversized dimensions so a note cannot blow up the layout", () => {
    const html = renderLatexToHtml("\\rule{1000em}{1em}", false);

    expect(html).not.toMatch(/width(:|=")1000em/);
    expect(html).toContain("border-right-width:50em");
  });
});
