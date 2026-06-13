import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/config/limits";
import { buildMindmapFlashcardSource } from "./mindmap-source";

function makeGraph(
  nodes: Array<{ id: string; label: string }>,
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    cross?: boolean;
  }>,
): string {
  return JSON.stringify({
    nodes: nodes.map((node) => ({
      id: node.id,
      position: { x: 0, y: 0 },
      data: { label: node.label },
    })),
    edges,
  });
}

describe("buildMindmapFlashcardSource", () => {
  it("renders the title and a nested outline of node labels", () => {
    const data = makeGraph(
      [
        { id: "root", label: "Cell biology" },
        { id: "a", label: "Mitochondria" },
      ],
      [{ id: "e1", source: "root", target: "a" }],
    );

    const result = buildMindmapFlashcardSource({ title: "Map", data });

    expect(result).toContain("Title: Map");
    expect(result).toContain("- Cell biology");
    expect(result).toContain("  - Mitochondria");
  });

  it("prefixes child labels with the edge relation label", () => {
    const data = makeGraph(
      [
        { id: "root", label: "Energy" },
        { id: "a", label: "ATP" },
      ],
      [{ id: "e1", source: "root", target: "a", label: "stored as" }],
    );

    const result = buildMindmapFlashcardSource({ title: "Map", data });

    expect(result).toContain("stored as → ATP");
  });

  it("excludes cross-connections from the hierarchy walk", () => {
    const data = makeGraph(
      [
        { id: "root", label: "Root" },
        { id: "a", label: "Child" },
      ],
      [
        { id: "e1", source: "root", target: "a" },
        { id: "x1", source: "a", target: "root", cross: true },
      ],
    );

    const result = buildMindmapFlashcardSource({ title: "Map", data });

    // Cross edge a -> root must not render Root as a child of Child.
    expect(result).toBe("Title: Map\n\n- Root\n  - Child");
  });

  it("returns only the title when the mindmap has no nodes", () => {
    const result = buildMindmapFlashcardSource({
      title: "Empty",
      data: null,
    });

    expect(result).toBe("Title: Empty");
  });

  it("caps source text to the AI input limit", () => {
    // Node labels are individually bounded, so a large map (many long-labelled
    // nodes) is what pushes the outline past the AI input limit.
    const nodes = Array.from({ length: 120 }, (_, index) => ({
      id: `n${index}`,
      label: "a".repeat(LIMITS.mindmapTitleMax),
    }));
    const data = makeGraph(nodes, []);

    const result = buildMindmapFlashcardSource({ title: "Long", data });

    expect(result.length).toBeLessThanOrEqual(LIMITS.flashcardAiMaxInput);
    expect(result).toContain("Title: Long");
  });
});
