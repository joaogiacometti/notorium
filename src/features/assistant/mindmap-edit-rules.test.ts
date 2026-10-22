import { describe, expect, it } from "vitest";
import type {
  MindmapDraft,
  MindmapEditsInput,
} from "@/features/assistant/document-edit-contract";
import { findMindmapEditProblems } from "@/features/assistant/mindmap-edit-rules";

const node = (id: string, label: string, root = false) => ({
  id,
  label,
  root,
  completeSubtree: true,
});
const tree = (id: string, source: string, target: string) => ({
  id,
  source,
  target,
  cross: false,
});
const draft: MindmapDraft = {
  kind: "mindmap",
  sessionId: "m",
  revision: 0,
  title: "Cells",
  partial: false,
  nodes: [
    node("root", "Cells", true),
    node("a", "Membrane"),
    { ...node("b", "Nucleus"), color: "chart-1", bold: true },
    { ...node("c", "DNA"), completeSubtree: false },
  ],
  edges: [
    tree("e1", "root", "a"),
    tree("e2", "root", "b"),
    tree("e3", "b", "c"),
    { id: "x1", source: "a", target: "c", cross: true, label: "uses" },
  ],
};

function problems(input: Omit<MindmapEditsInput, "sessionId" | "revision">) {
  return findMindmapEditProblems(
    { sessionId: "m", revision: 0, ...input },
    draft,
  );
}

describe("mindmap edit rules", () => {
  it("accepts real changes, including edits to new nodes", () => {
    expect(
      problems({
        addNodes: [{ id: "n1", parentId: "a", label: "Lipids" }],
        renameNodes: [{ nodeId: "n1", label: "Lipid bilayer" }],
        styleNodes: [{ nodeId: "b", bold: false }],
        moveNodes: [{ nodeId: "a", parentId: "b" }],
        updateConnections: [
          { edgeId: "x1", label: "uses", direction: "forward" },
        ],
      }),
    ).toEqual([]);
  });

  it("lists visible ids for unknown nodes and connections", () => {
    expect(
      problems({
        renameNodes: [{ nodeId: "zz", label: "New" }],
        disconnect: [{ edgeId: "e1" }],
      }),
    ).toEqual([
      "Unknown node id zz; expected one of root, a, b, c",
      "Unknown cross-connection id e1; expected one of x1",
    ]);
  });

  it("rejects reused aliases, root changes, and partial removals", () => {
    expect(
      problems({
        addNodes: [{ id: "a", parentId: "root", label: "Other" }],
        styleNodes: [{ nodeId: "root", bold: true }],
        removeNodes: [{ nodeId: "c" }],
      }),
    ).toEqual([
      "New node id a is already used; expected a unique new alias for each added node",
      "Cannot style root root; expected a non-root node (rename the root to change the title)",
      "Node c has descendants outside the draft; expected removal of complete subtrees only",
    ]);
  });

  it("rejects operations that change nothing", () => {
    expect(
      problems({
        renameNodes: [{ nodeId: "a", label: " Membrane " }],
        styleNodes: [{ nodeId: "b", color: "chart-1", bold: true }],
        moveNodes: [{ nodeId: "c", parentId: "b" }],
        updateConnections: [{ edgeId: "x1", label: "uses", direction: "none" }],
      }),
    ).toHaveLength(4);
  });

  it("rejects cycles, self links, and duplicate connections", () => {
    expect(
      problems({
        moveNodes: [{ nodeId: "b", parentId: "c" }],
        connect: [
          { source: "a", target: "a", label: "", direction: "none" },
          { source: "c", target: "a", label: "", direction: "none" },
        ],
      }),
    ).toEqual([
      "Move of b under c is inside its own subtree; expected a parent outside that branch",
      "Connection a:a links a node to itself; expected distinct nodes",
      "Nodes c and a are already connected by x1; expected updateConnections for that edge",
    ]);
  });
});
