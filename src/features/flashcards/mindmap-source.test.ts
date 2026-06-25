import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/config/limits";
import {
  buildMindmapFlashcardSource,
  buildMindmapFlashcardSourceWithImages,
} from "./mindmap-source";

function makeGraph(
  nodes: Array<{
    id: string;
    label: string;
    imageUrl?: string;
    kind?: "root" | "branch" | "image";
  }>,
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
      data: {
        label: node.label,
        ...(node.imageUrl ? { imageUrl: node.imageUrl } : {}),
        ...(node.kind ? { kind: node.kind } : {}),
      },
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

  it("keeps cross-connections out of the hierarchy and lists them separately", () => {
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

    expect(result).toBe(
      "Title: Map\n\n- Root\n  - Child\n\nRelated connections:\n- Child -- Root",
    );
  });

  it("returns image placeholders and their matching rich-text images", () => {
    const data = makeGraph(
      [
        {
          id: "root",
          label: "Value object",
          imageUrl:
            "/api/attachments/blob?pathname=notorium%2Fmindmaps%2Fu%2Fvo.png",
        },
      ],
      [],
    );

    const result = buildMindmapFlashcardSourceWithImages({
      title: "Map",
      data,
    });

    expect(result.text).toContain("- Value object\n  {{IMAGE_0}}");
    expect(result.images).toEqual([
      '<img src="/api/attachments/blob?pathname=notorium%2Fmindmaps%2Fu%2Fvo.png" alt="">',
    ]);
  });

  it("wraps code-like multiline labels in fenced code blocks", () => {
    const data = makeGraph(
      [
        { id: "root", label: "Primitive obsession" },
        {
          id: "code",
          label: "class Person\n{\n  private int _id;\n}",
        },
      ],
      [{ id: "e1", source: "root", target: "code" }],
    );

    const result = buildMindmapFlashcardSource({ title: "Map", data });

    expect(result).toContain(
      "  - ```csharp\n    class Person\n    {\n      private int _id;\n    }\n    ```",
    );
  });

  it("uses standalone image nodes in related connections", () => {
    const data = makeGraph(
      [
        { id: "a", label: "Diagram" },
        {
          id: "img",
          label: "",
          kind: "image",
          imageUrl: "https://example.com/value-object.png",
        },
      ],
      [{ id: "x1", source: "a", target: "img", cross: true }],
    );

    const result = buildMindmapFlashcardSourceWithImages({
      title: "Map",
      data,
    });

    expect(result.text).toContain(
      "Related connections:\n- Diagram -- {{IMAGE_0}}",
    );
    expect(result.images).toEqual([
      '<img src="https://example.com/value-object.png" alt="">',
    ]);
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
      label: "a".repeat(LIMITS.mindmapNodeLabelMax),
    }));
    const data = makeGraph(nodes, []);

    const result = buildMindmapFlashcardSource({ title: "Long", data });

    expect(result.length).toBeLessThanOrEqual(LIMITS.flashcardAiMaxInput);
    expect(result).toContain("Title: Long");
  });
});
