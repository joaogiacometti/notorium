import { describe, expect, it } from "vitest";
import type { MindmapEditsInput } from "@/features/assistant/document-edit-contract";
import {
  buildMindmapDraft,
  prepareMindmapEdits,
} from "@/features/assistant/mindmap-edit-content";
import type { MindmapGraph } from "@/features/mindmaps/types";

const graph: MindmapGraph = {
  nodes: [
    {
      id: "root",
      position: { x: 0, y: 0 },
      data: { kind: "root", label: "Cells" },
    },
    {
      id: "a",
      position: { x: 200, y: 0 },
      data: {
        label: "Nucleus",
        bold: true,
        imageUrl: "/api/attachments/blob?pathname=private",
      },
    },
    { id: "b", position: { x: 400, y: 0 }, data: { label: "DNA" } },
    {
      id: "c",
      position: { x: -200, y: 0 },
      data: { label: "Membrane", color: "chart-1" },
    },
  ],
  edges: [
    { id: "ra", source: "root", target: "a" },
    { id: "ab", source: "a", target: "b" },
    { id: "rc", source: "root", target: "c" },
    {
      id: "cross",
      source: "b",
      target: "c",
      cross: true,
      direction: "forward",
      label: "relates",
    },
  ],
};
function edit(lists: Omit<MindmapEditsInput, "sessionId" | "revision">) {
  return { sessionId: "s", revision: 0, ...lists };
}

describe("mindmap edit proposals", () => {
  it("captures branches and directed edges without attachment locations or positions", () => {
    const draft = buildMindmapDraft("s", 0, "Cells", graph, ["a"]);
    expect(draft.nodes[0].id).toBe("a");
    expect(draft.nodes.every((node) => node.completeSubtree)).toBe(true);
    expect(draft.edges.find((edge) => edge.id === "cross")).toMatchObject({
      direction: "forward",
      cross: true,
    });
    expect(JSON.stringify(draft)).not.toMatch(/pathname|position/);
  });
  it("renames a node while preserving its image, style, and position", () => {
    const draft = buildMindmapDraft("s", 0, "Cells", graph);
    const result = prepareMindmapEdits(
      draft,
      graph,
      edit({ renameNodes: [{ nodeId: "a", label: "Cell nucleus" }] }),
    );
    expect(result.graph.nodes[1]).toEqual({
      ...graph.nodes[1],
      data: { ...graph.nodes[1].data, label: "Cell nucleus" },
    });
    expect(graph.nodes[1].data.label).toBe("Nucleus");
  });
  it("adds branches through proposal-local ids and moves existing subtrees", () => {
    const draft = buildMindmapDraft("s", 0, "Cells", graph);
    const result = prepareMindmapEdits(
      draft,
      graph,
      edit({
        addNodes: [
          { id: "new", parentId: "root", label: "Organelles" },
          { id: "child", parentId: "new", label: "Mitochondria" },
        ],
        moveNodes: [{ nodeId: "a", parentId: "new" }],
      }),
    );
    const added = result.graph.nodes.find(
      (node) => node.data.label === "Organelles",
    );
    expect(added?.id).not.toBe("new");
    expect(result.graph.edges.find((edge) => edge.target === "a")?.source).toBe(
      added?.id,
    );
    expect(result.graph.nodes).toHaveLength(6);
  });
  it("renames the title through the root and supports cross-connection changes", () => {
    const draft = buildMindmapDraft("s", 0, "Cells", graph);
    const result = prepareMindmapEdits(
      draft,
      graph,
      edit({
        renameNodes: [{ nodeId: "root", label: "Cell biology" }],
        updateConnections: [
          { edgeId: "cross", label: "interacts", direction: "both" },
        ],
        connect: [
          {
            source: "a",
            target: "c",
            label: "contains",
            direction: "backward",
          },
        ],
      }),
    );
    expect(result.title).toBe("Cell biology");
    expect(
      result.graph.edges.find((edge) => edge.id === "cross"),
    ).toMatchObject({ label: "interacts", direction: "both" });
    expect(result.graph.edges).toHaveLength(5);
  });
  it("restyles nodes and exposes current styles in the draft", () => {
    const draft = buildMindmapDraft("s", 0, "Cells", graph);
    expect(draft.nodes.find((node) => node.id === "c")?.color).toBe("chart-1");
    const result = prepareMindmapEdits(
      draft,
      graph,
      edit({
        styleNodes: [
          { nodeId: "b", color: "chart-3", italic: true },
          { nodeId: "c", color: "none" },
          { nodeId: "a", bold: false },
        ],
      }),
    );
    const dataOf = (id: string) =>
      result.graph.nodes.find((node) => node.id === id)?.data;
    expect(dataOf("b")).toEqual({
      label: "DNA",
      color: "chart-3",
      italic: true,
    });
    expect(dataOf("c")).toEqual({ label: "Membrane" });
    expect(dataOf("a")?.bold).toBeUndefined();
    expect(() =>
      prepareMindmapEdits(
        draft,
        graph,
        edit({ styleNodes: [{ nodeId: "root", color: "chart-2" }] }),
      ),
    ).toThrow("expected a non-root branch");
  });
  it("undoes double-escaped LaTeX in proposed labels", () => {
    const result = prepareMindmapEdits(
      buildMindmapDraft("s", 0, "Cells", graph),
      graph,
      edit({
        addNodes: [{ id: "n", parentId: "b", label: "$A = \\\\frac{1}{2}bh$" }],
      }),
    );
    expect(result.graph.nodes.at(-1)?.data.label).toBe("$A = \\frac{1}{2}bh$");
  });
  it("removes complete subtrees and their incident connections", () => {
    const result = prepareMindmapEdits(
      buildMindmapDraft("s", 0, "Cells", graph),
      graph,
      edit({ removeNodes: [{ nodeId: "a" }] }),
    );
    expect(result.graph.nodes.map((node) => node.id)).toEqual(["root", "c"]);
    expect(result.graph.edges).toHaveLength(1);
  });
  it("rejects invalid batches atomically", () => {
    const draft = buildMindmapDraft("s", 0, "Cells", graph);
    for (const invalid of [
      { removeNodes: [{ nodeId: "root" }] },
      { moveNodes: [{ nodeId: "a", parentId: "b" }] },
      { renameNodes: [{ nodeId: "missing", label: "No" }] },
      { disconnect: [{ edgeId: "ra" }] },
    ])
      expect(() =>
        prepareMindmapEdits(
          draft,
          graph,
          edit({
            styleNodes: [{ nodeId: "a", color: "chart-2" }],
            ...invalid,
          }),
        ),
      ).toThrow();
    expect(graph.nodes[1].data.label).toBe("Nucleus");
    expect(() =>
      prepareMindmapEdits(
        {
          ...draft,
          nodes: draft.nodes.map((node) => ({
            ...node,
            completeSubtree: false,
          })),
        },
        graph,
        edit({ removeNodes: [{ nodeId: "a" }] }),
      ),
    ).toThrow("Incomplete subtree");
  });
});
