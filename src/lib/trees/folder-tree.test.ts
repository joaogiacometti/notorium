import { describe, expect, it } from "vitest";
import type { FolderTreeNode } from "@/lib/server/api-contracts";
import {
  findFolderTreeNode,
  getFolderAncestorIds,
  insertFolderTreeNode,
  isFolderDescendant,
  moveFolderTreeNode,
  normalizeFolderTree,
} from "@/lib/trees/folder-tree";

function node(
  id: string,
  name: string,
  children: FolderTreeNode[] = [],
  documentCount = 0,
  parentFolderId: string | null = null,
): FolderTreeNode {
  return {
    id,
    name,
    documentCount,
    children,
    path: name,
    parentFolderId,
  } as FolderTreeNode;
}

describe("normalizeFolderTree", () => {
  it("sets path for root nodes", () => {
    const input = [node("1", "Root")];
    const result = normalizeFolderTree(input);

    expect(result[0]?.path).toBe("Root");
  });

  it("sets nested paths", () => {
    const input = [node("1", "Root", [node("2", "Child")])];
    const result = normalizeFolderTree(input);

    expect(result[0]?.children[0]?.path).toBe("Root::Child");
  });

  it("accumulates documentCount from descendants", () => {
    // The API provides documentCount as a sum including children. This test
    // documents the normalization behavior: when a parent node already includes
    // its children's counts, directDocumentCount becomes the difference (which
    // can be zero or negative), and normalizedChildren.documentCount is
    // accumulated back to produce the correct total.
    const input2 = [
      node(
        "1",
        "Root",
        [
          node("2", "Child A", [node("3", "Grandchild", [], 8)]),
          node("4", "Child B", [], 3),
        ],
        11 /* Root.documentCount = 8 + 3 */,
      ),
    ];
    const result2 = normalizeFolderTree(input2);

    // Child A: documentCount=0, children=[Grandchild(8)]
    // previousChildCount = 8
    // directDocumentCount = Math.max(0, 0 - 8) = 0
    // nextDocumentCount = 0 + 8 = 8
    expect(result2[0]?.children[0]?.documentCount).toBe(8);
    // Child B: documentCount=3, children=[]
    // previousChildCount = 0
    // directDocumentCount = 3 - 0 = 3
    expect(result2[0]?.children[1]?.documentCount).toBe(3);
  });
});

describe("findFolderTreeNode", () => {
  it("finds a root node", () => {
    const input = [node("1", "Root")];
    expect(findFolderTreeNode(input, "1")?.id).toBe("1");
  });

  it("finds a nested node", () => {
    const input = [
      node("1", "Root", [node("2", "Child", [node("3", "Grandchild")])]),
    ];
    expect(findFolderTreeNode(input, "3")?.name).toBe("Grandchild");
  });

  it("returns null when not found", () => {
    const input = [node("1", "Root")];
    expect(findFolderTreeNode(input, "999")).toBeNull();
  });
});

describe("isFolderDescendant", () => {
  it("returns true when target is a direct child", () => {
    const input = [node("1", "Parent", [node("2", "Child")])];
    expect(isFolderDescendant(input, "1", "2")).toBe(true);
  });

  it("returns true when target is nested deeper", () => {
    const input = [node("1", "Root", [node("2", "Mid", [node("3", "Leaf")])])];
    expect(isFolderDescendant(input, "1", "3")).toBe(true);
  });

  it("returns false when target is not a descendant", () => {
    const input = [node("1", "A"), node("2", "B")];
    expect(isFolderDescendant(input, "1", "2")).toBe(false);
  });

  it("returns false when ancestor does not exist", () => {
    const input = [node("1", "Root")];
    expect(isFolderDescendant(input, "999", "1")).toBe(false);
  });
});

describe("insertFolderTreeNode", () => {
  it("appends to root when parentFolderId is null", () => {
    const input = [node("1", "Existing")];
    const toInsert = node("2", "New");
    const result = insertFolderTreeNode(input, toInsert, null);

    expect(result).toHaveLength(2);
    expect(result[1]?.id).toBe("2");
  });

  it("inserts as child of matching node", () => {
    const input = [node("1", "Parent")];
    const toInsert = node("2", "Child");
    const result = insertFolderTreeNode(input, toInsert, "1");

    expect(result[0]?.children).toHaveLength(1);
    expect(result[0]?.children[0]?.id).toBe("2");
  });

  it("sets parentFolderId on inserted node", () => {
    const input = [node("1", "Parent")];
    const toInsert = node("2", "Child");
    const result = insertFolderTreeNode(input, toInsert, "1");

    expect(result[0]?.children[0]?.parentFolderId).toBe("1");
  });

  it("maintains alphabetical order after insert", () => {
    const input = [node("1", "Parent", [node("2", "Zebra")])];
    const result = insertFolderTreeNode(input, node("3", "Alpha"), "1");

    expect(result[0]?.children[0]?.name).toBe("Alpha");
  });

  it("sorts root nodes alphabetically", () => {
    const input = [node("1", "Zebra"), node("2", "Alpha"), node("3", "Middle")];
    const result = insertFolderTreeNode(input, node("4", "Beta"), null);

    expect(result.map((n) => n.name)).toEqual([
      "Alpha",
      "Beta",
      "Middle",
      "Zebra",
    ]);
  });
});

describe("moveFolderTreeNode", () => {
  it("moves a node to a new parent", () => {
    const input = [
      node("1", "Parent", [node("2", "Child")]),
      node("3", "Orphan"),
    ];
    const result = moveFolderTreeNode(input, "3", "1");

    expect(findFolderTreeNode(result, "3")?.parentFolderId).toBe("1");
  });

  it("moves a node to root", () => {
    const input = [node("1", "Parent", [node("2", "Child")])];
    const result = moveFolderTreeNode(input, "2", null);

    expect(findFolderTreeNode(result, "2")?.parentFolderId).toBeNull();
  });

  it("returns original tree when node not found", () => {
    const input = [node("1", "Root")];
    const result = moveFolderTreeNode(input, "999", null);

    expect(result).toEqual(input);
  });

  it("preserves children when moving a parent node", () => {
    const input = [
      node("1", "OldParent", [node("2", "Child", [node("3", "Grandchild")])]),
      node("4", "NewParent"),
    ];
    const result = moveFolderTreeNode(input, "1", "4");

    expect(findFolderTreeNode(result, "2")?.id).toBe("2");
    expect(findFolderTreeNode(result, "3")?.id).toBe("3");
    expect(findFolderTreeNode(result, "1")?.parentFolderId).toBe("4");
  });

  it("no-ops when moving a node to its existing parent", () => {
    const input = [node("1", "Parent", [node("2", "Child")])];
    const result = moveFolderTreeNode(input, "2", "1");

    expect(findFolderTreeNode(result, "2")).not.toBeNull();
    expect(result[0]?.children).toHaveLength(1);
    expect(result[0]?.children[0]?.id).toBe("2");
  });
});

describe("getFolderAncestorIds", () => {
  it("returns empty array for root node", () => {
    const input = [node("1", "Root")];
    expect(getFolderAncestorIds(input, "1")).toEqual([]);
  });

  it("returns ancestors for nested node", () => {
    const input = [
      node("1", "Root", [node("2", "Child", [node("3", "Grandchild")])]),
    ];
    expect(getFolderAncestorIds(input, "3")).toEqual(["1", "2"]);
  });

  it("returns only direct parent when node is direct child", () => {
    const input = [node("1", "Root", [node("2", "Child")])];
    expect(getFolderAncestorIds(input, "2")).toEqual(["1"]);
  });

  it("returns empty array when node not found", () => {
    const input = [node("1", "Root")];
    expect(getFolderAncestorIds(input, "999")).toEqual([]);
  });
});
