import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildSearchMatchSnippet,
  renderSearchHighlightedText,
  splitSearchHighlightSegments,
} from "@/lib/search/highlight";

describe("splitSearchHighlightSegments", () => {
  it("matches case-insensitively while preserving display casing", () => {
    expect(splitSearchHighlightSegments("Organic Chemistry", "chem")).toEqual([
      { text: "Organic ", highlighted: false, offset: 0 },
      { text: "Chem", highlighted: true, offset: 8 },
      { text: "istry", highlighted: false, offset: 12 },
    ]);
  });

  it("highlights multiple literal matches", () => {
    expect(
      splitSearchHighlightSegments("C++ notes and c++ cards", "c++"),
    ).toEqual([
      { text: "C++", highlighted: true, offset: 0 },
      { text: " notes and ", highlighted: false, offset: 3 },
      { text: "c++", highlighted: true, offset: 14 },
      { text: " cards", highlighted: false, offset: 17 },
    ]);
  });

  it("does not highlight without a text query", () => {
    expect(splitSearchHighlightSegments("Recent note", " ")).toEqual([
      { text: "Recent note", highlighted: false, offset: 0 },
    ]);
  });
});

describe("buildSearchMatchSnippet", () => {
  it("keeps the matching phrase visible in a centered snippet", () => {
    expect(
      buildSearchMatchSnippet(
        "Alpha beta gamma delta epsilon zeta eta theta",
        "epsilon",
        24,
      ),
    ).toBe("...a delta epsilon zeta eta...");
  });

  it("truncates from the end when the query is absent", () => {
    expect(
      buildSearchMatchSnippet("Alpha beta gamma delta", "missing", 12),
    ).toBe("Alpha beta g...");
  });

  it("keeps long matching phrases intact", () => {
    expect(
      buildSearchMatchSnippet(
        "prefix searchable phrase suffix",
        "searchable phrase",
        8,
      ),
    ).toBe("...searchable phrase...");
  });
});

describe("renderSearchHighlightedText", () => {
  it("renders mark elements without raw HTML injection", () => {
    const markup = renderToStaticMarkup(
      renderSearchHighlightedText("<script>Needle</script>", "needle"),
    );

    expect(markup).toContain("<mark");
    expect(markup).toContain('data-search-highlight="true"');
    expect(markup).toContain("Needle");
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>");
  });
});
