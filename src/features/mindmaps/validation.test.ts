import { describe, expect, it } from "vitest";
import {
  createMindmapSchema,
  editMindmapSchema,
  editMindmapTitleSchema,
} from "@/features/mindmaps/validation";

const validGraph = JSON.stringify({
  nodes: [{ id: "n1", position: { x: 0, y: 0 }, data: { label: "Root" } }],
  edges: [],
});

describe("createMindmapSchema", () => {
  it("accepts a non-empty title with a subject", () => {
    expect(
      createMindmapSchema.safeParse({ title: "Map", subjectId: "subject-1" })
        .success,
    ).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(
      createMindmapSchema.safeParse({ title: "", subjectId: "subject-1" })
        .success,
    ).toBe(false);
  });

  it("rejects a missing subject", () => {
    expect(createMindmapSchema.safeParse({ title: "Map" }).success).toBe(false);
  });
});

describe("editMindmapSchema", () => {
  it("accepts a valid serialized graph", () => {
    const result = editMindmapSchema.safeParse({
      id: "m1",
      title: "Map",
      data: validGraph,
    });
    expect(result.success).toBe(true);
  });

  it("rejects data that is not valid JSON", () => {
    const result = editMindmapSchema.safeParse({
      id: "m1",
      title: "Map",
      data: "not json",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a graph whose nodes exceed the node limit", () => {
    const nodes = Array.from({ length: 201 }, (_, index) => ({
      id: `n${index}`,
      position: { x: 0, y: 0 },
      data: { label: "x" },
    }));
    const result = editMindmapSchema.safeParse({
      id: "m1",
      title: "Map",
      data: JSON.stringify({ nodes, edges: [] }),
    });
    expect(result.success).toBe(false);
  });

  it("accepts node color and edge label/direction", () => {
    const data = JSON.stringify({
      nodes: [
        {
          id: "n1",
          position: { x: 0, y: 0 },
          data: { label: "Root", color: "chart-2" },
        },
      ],
      edges: [
        {
          id: "e1",
          source: "n1",
          target: "n1",
          label: "rel",
          direction: "both",
        },
      ],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(true);
  });

  it("accepts node bold, italic, and root kind", () => {
    const data = JSON.stringify({
      nodes: [
        {
          id: "n1",
          position: { x: 0, y: 0 },
          data: { label: "Center", bold: true, italic: true, kind: "root" },
        },
      ],
      edges: [],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(true);
  });

  it("accepts an internal attachment image url on a node", () => {
    const data = JSON.stringify({
      nodes: [
        {
          id: "n1",
          position: { x: 0, y: 0 },
          data: {
            label: "Pic",
            imageUrl:
              "/api/attachments/blob?pathname=notorium/mindmaps/u1/a.png",
          },
        },
      ],
      edges: [],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(true);
  });

  it("accepts a standalone image node with kind and size", () => {
    const data = JSON.stringify({
      nodes: [
        {
          id: "img1",
          position: { x: 10, y: 20 },
          data: {
            label: "",
            kind: "image",
            width: 320,
            height: 180,
            imageUrl: "https://example.com/a.png",
          },
        },
      ],
      edges: [],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(true);
  });

  it("rejects a non-positive image node size", () => {
    const data = JSON.stringify({
      nodes: [
        {
          id: "img1",
          position: { x: 0, y: 0 },
          data: { label: "", kind: "image", width: 0, height: 180 },
        },
      ],
      edges: [],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(false);
  });

  it("rejects a non-url node image", () => {
    const data = JSON.stringify({
      nodes: [
        {
          id: "n1",
          position: { x: 0, y: 0 },
          data: { label: "Pic", imageUrl: "not-a-url" },
        },
      ],
      edges: [],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(false);
  });

  it("rejects an unknown node kind", () => {
    const data = JSON.stringify({
      nodes: [
        {
          id: "n1",
          position: { x: 0, y: 0 },
          data: { label: "Center", kind: "trunk" },
        },
      ],
      edges: [],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(false);
  });

  it("rejects an unknown node color", () => {
    const data = JSON.stringify({
      nodes: [
        {
          id: "n1",
          position: { x: 0, y: 0 },
          data: { label: "Root", color: "neon-pink" },
        },
      ],
      edges: [],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(false);
  });

  it("accepts edge handles and a curve offset", () => {
    const data = JSON.stringify({
      nodes: [],
      edges: [
        {
          id: "e1",
          source: "a",
          target: "b",
          sourceHandle: "r-source",
          targetHandle: "l-target",
          curveOffset: { x: 12, y: -8 },
        },
      ],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(true);
  });

  it("rejects a malformed curve offset", () => {
    const data = JSON.stringify({
      nodes: [],
      edges: [{ id: "e1", source: "a", target: "b", curveOffset: { x: 1 } }],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(false);
  });

  it("accepts a backward edge direction", () => {
    const data = JSON.stringify({
      nodes: [],
      edges: [{ id: "e1", source: "a", target: "b", direction: "backward" }],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(true);
  });

  it("rejects an unknown edge direction", () => {
    const data = JSON.stringify({
      nodes: [],
      edges: [{ id: "e1", source: "a", target: "b", direction: "sideways" }],
    });
    expect(
      editMindmapSchema.safeParse({ id: "m1", title: "Map", data }).success,
    ).toBe(false);
  });

  it("rejects a malformed graph shape", () => {
    const result = editMindmapSchema.safeParse({
      id: "m1",
      title: "Map",
      data: JSON.stringify({ nodes: [{ id: "n1" }], edges: [] }),
    });
    expect(result.success).toBe(false);
  });
});

describe("editMindmapTitleSchema", () => {
  it("accepts a non-empty title with an id", () => {
    expect(
      editMindmapTitleSchema.safeParse({ id: "m1", title: "Renamed" }).success,
    ).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(
      editMindmapTitleSchema.safeParse({ id: "m1", title: "" }).success,
    ).toBe(false);
  });

  it("rejects a missing id", () => {
    expect(editMindmapTitleSchema.safeParse({ title: "Renamed" }).success).toBe(
      false,
    );
  });

  it("does not require a data field", () => {
    const result = editMindmapTitleSchema.safeParse({
      id: "m1",
      title: "Renamed",
    });
    expect(result.success).toBe(true);
  });
});
