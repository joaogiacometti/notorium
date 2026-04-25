import { describe, expect, it } from "vitest";
import type { DeckTreeNode } from "@/lib/server/api-contracts";
import {
  filterDeckTree,
  findDeckTreeNode,
  getDeckAncestorIds,
  getExpandedIdsForVisibleTree,
  insertDeckTreeNode,
  isDeckDescendant,
  moveDeckTreeNode,
  normalizeDeckTree,
  removeDeckTreeNode,
  updateDeckTreeNode,
} from "@/lib/trees/deck-tree";

function node(
  id: string,
  name: string,
  children: DeckTreeNode[] = [],
  flashcardCount = 0,
  parentDeckId: string | null = null,
): DeckTreeNode {
  return {
    id,
    name,
    flashcardCount,
    children,
    path: name,
    parentDeckId,
  } as DeckTreeNode;
}

describe("normalizeDeckTree", () => {
  it("sets path for root nodes", () => {
    const input = [node("1", "Root")];
    const result = normalizeDeckTree(input);

    expect(result[0]?.path).toBe("Root");
  });

  it("sets nested paths", () => {
    const input = [node("1", "Root", [node("2", "Child")])];
    const result = normalizeDeckTree(input);

    expect(result[0]?.children[0]?.path).toBe("Root::Child");
  });

  it("accumulates flashcardCount from descendants", () => {
    // The API provides flashcardCount as a sum including children. This test
    // documents the normalization behavior: when a parent node already includes
    // its children's counts, directFlashcardCount becomes the difference (which
    // can be zero or negative), and normalizedChildren.flashcardCount is
    // accumulated back to produce the correct total.
    const input2 = [
      node(
        "1",
        "Root",
        [
          node("2", "Child A", [node("3", "Grandchild", [], 8)]),
          node("4", "Child B", [], 3),
        ],
        11 /* Root.flashcardCount = 8 + 3 */,
      ),
    ];
    const result2 = normalizeDeckTree(input2);

    // Child A: flashcardCount=0, children=[Grandchild(8)]
    // previousChildCount = 8
    // directFlashcardCount = Math.max(0, 0 - 8) = 0
    // nextFlashcardCount = 0 + 8 = 8
    expect(result2[0]?.children[0]?.flashcardCount).toBe(8);
    // Child B: flashcardCount=3, children=[]
    // previousChildCount = 0
    // directFlashcardCount = 3 - 0 = 3
    expect(result2[0]?.children[1]?.flashcardCount).toBe(3);
  });
});

describe("updateDeckTreeNode", () => {
  it("updates a matching node", () => {
    const input = [node("1", "Keep"), node("2", "Target")];
    const result = updateDeckTreeNode(input, "2", (n) => ({
      ...n,
      name: "Updated",
    }));

    expect(result[1]?.name).toBe("Updated");
  });

  it("does not modify non-matching nodes", () => {
    const input = [node("1", "Keep")];
    const result = updateDeckTreeNode(input, "999", (n) => ({
      ...n,
      name: "X",
    }));

    expect(result[0]?.name).toBe("Keep");
  });

  it("recurses into children", () => {
    const input = [node("1", "Parent", [node("2", "Target")])];
    const result = updateDeckTreeNode(input, "2", (n) => ({
      ...n,
      name: "Deep Updated",
    }));

    expect(result[0]?.children[0]?.name).toBe("Deep Updated");
  });
});

describe("removeDeckTreeNode", () => {
  it("removes the matching node", () => {
    const input = [node("1", "Keep"), node("2", "Gone")];
    const result = removeDeckTreeNode(input, "2");

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("1");
  });

  it("recurses into children", () => {
    const input = [node("1", "Parent", [node("2", "Gone")])];
    const result = removeDeckTreeNode(input, "2");

    expect(result[0]?.children).toHaveLength(0);
  });
});

describe("findDeckTreeNode", () => {
  it("finds a root node", () => {
    const input = [node("1", "Root")];
    expect(findDeckTreeNode(input, "1")?.id).toBe("1");
  });

  it("finds a nested node", () => {
    const input = [
      node("1", "Root", [node("2", "Child", [node("3", "Grandchild")])]),
    ];
    expect(findDeckTreeNode(input, "3")?.name).toBe("Grandchild");
  });

  it("returns null when not found", () => {
    const input = [node("1", "Root")];
    expect(findDeckTreeNode(input, "999")).toBeNull();
  });
});

describe("isDeckDescendant", () => {
  it("returns true when target is a direct child", () => {
    const input = [node("1", "Parent", [node("2", "Child")])];
    expect(isDeckDescendant(input, "1", "2")).toBe(true);
  });

  it("returns true when target is nested deeper", () => {
    const input = [node("1", "Root", [node("2", "Mid", [node("3", "Leaf")])])];
    expect(isDeckDescendant(input, "1", "3")).toBe(true);
  });

  it("returns false when target is not a descendant", () => {
    const input = [node("1", "A"), node("2", "B")];
    expect(isDeckDescendant(input, "1", "2")).toBe(false);
  });

  it("returns false when ancestor does not exist", () => {
    const input = [node("1", "Root")];
    expect(isDeckDescendant(input, "999", "1")).toBe(false);
  });
});

describe("insertDeckTreeNode", () => {
  it("appends to root when parentDeckId is null", () => {
    const input = [node("1", "Existing")];
    const toInsert = node("2", "New");
    const result = insertDeckTreeNode(input, toInsert, null);

    expect(result).toHaveLength(2);
    expect(result[1]?.id).toBe("2");
  });

  it("inserts as child of matching node", () => {
    const input = [node("1", "Parent")];
    const toInsert = node("2", "Child");
    const result = insertDeckTreeNode(input, toInsert, "1");

    expect(result[0]?.children).toHaveLength(1);
    expect(result[0]?.children[0]?.id).toBe("2");
  });

  it("sets parentDeckId on inserted node", () => {
    const input = [node("1", "Parent")];
    const toInsert = node("2", "Child");
    const result = insertDeckTreeNode(input, toInsert, "1");

    expect(result[0]?.children[0]?.parentDeckId).toBe("1");
  });

  it("maintains alphabetical order after insert", () => {
    const input = [node("1", "Parent", [node("2", "Zebra")])];
    const result = insertDeckTreeNode(input, node("3", "Alpha"), "1");

    expect(result[0]?.children[0]?.name).toBe("Alpha");
  });

  it("sorts root nodes alphabetically", () => {
    const input = [node("1", "Zebra"), node("2", "Alpha"), node("3", "Middle")];
    const result = insertDeckTreeNode(input, node("4", "Beta"), null);

    expect(result.map((n) => n.name)).toEqual([
      "Alpha",
      "Beta",
      "Middle",
      "Zebra",
    ]);
  });
});

describe("moveDeckTreeNode", () => {
  it("moves a node to a new parent", () => {
    const input = [
      node("1", "Parent", [node("2", "Child")]),
      node("3", "Orphan"),
    ];
    const result = moveDeckTreeNode(input, "3", "1");

    expect(findDeckTreeNode(result, "3")?.parentDeckId).toBe("1");
  });

  it("moves a node to root", () => {
    const input = [node("1", "Parent", [node("2", "Child")])];
    const result = moveDeckTreeNode(input, "2", null);

    expect(findDeckTreeNode(result, "2")?.parentDeckId).toBeNull();
  });

  it("returns original tree when node not found", () => {
    const input = [node("1", "Root")];
    const result = moveDeckTreeNode(input, "999", null);

    expect(result).toEqual(input);
  });

  it("preserves children when moving a parent node", () => {
    const input = [
      node("1", "OldParent", [node("2", "Child", [node("3", "Grandchild")])]),
      node("4", "NewParent"),
    ];
    const result = moveDeckTreeNode(input, "1", "4");

    expect(findDeckTreeNode(result, "2")?.id).toBe("2");
    expect(findDeckTreeNode(result, "3")?.id).toBe("3");
    expect(findDeckTreeNode(result, "1")?.parentDeckId).toBe("4");
  });

  it("no-ops when moving a node to its existing parent", () => {
    const input = [node("1", "Parent", [node("2", "Child")])];
    const result = moveDeckTreeNode(input, "2", "1");

    expect(findDeckTreeNode(result, "2")).not.toBeNull();
    expect(result[0]?.children).toHaveLength(1);
    expect(result[0]?.children[0]?.id).toBe("2");
  });
});

describe("filterDeckTree", () => {
  it("returns all nodes when query is empty", () => {
    const input = [node("1", "Alpha"), node("2", "Beta")];
    expect(filterDeckTree(input, "")).toHaveLength(2);
  });

  it("filters by name", () => {
    const input = [node("1", "Alpha"), node("2", "Beta")];
    expect(filterDeckTree(input, "alp")).toHaveLength(1);
  });

  it("includes parent when child matches", () => {
    const input = [node("1", "Parent", [node("2", "MatchingChild")])];
    const result = filterDeckTree(input, "match");

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("1");
  });

  it("is case-insensitive", () => {
    const input = [node("1", "Alpha")];
    expect(filterDeckTree(input, "ALPHA")).toHaveLength(1);
  });
});

describe("getExpandedIdsForVisibleTree", () => {
  it("includes all nodes with children", () => {
    const input = [node("1", "Parent", [node("2", "Child")])];
    const result = getExpandedIdsForVisibleTree(input);

    expect(result.has("1")).toBe(true);
  });

  it("excludes leaf nodes", () => {
    const input = [node("1", "Leaf")];
    expect(getExpandedIdsForVisibleTree(input).has("1")).toBe(false);
  });

  it("includes deeply nested nodes", () => {
    const input = [
      node("1", "Root", [node("2", "Child", [node("3", "Grandchild")])]),
    ];
    const result = getExpandedIdsForVisibleTree(input);

    // intermediate nodes (Root and Child) have children and are included
    expect(result.has("1")).toBe(true);
    expect(result.has("2")).toBe(true);
    // leaf node (Grandchild) has no children and is not included
    expect(result.has("3")).toBe(false);
  });

  it("returns empty set for empty input", () => {
    expect(getExpandedIdsForVisibleTree([]).size).toBe(0);
  });
});

describe("getDeckAncestorIds", () => {
  it("returns empty array for root node", () => {
    const input = [node("1", "Root")];
    expect(getDeckAncestorIds(input, "1")).toEqual([]);
  });

  it("returns ancestors for nested node", () => {
    const input = [
      node("1", "Root", [node("2", "Child", [node("3", "Grandchild")])]),
    ];
    expect(getDeckAncestorIds(input, "3")).toEqual(["1", "2"]);
  });

  it("returns only direct parent when node is direct child", () => {
    const input = [node("1", "Root", [node("2", "Child")])];
    expect(getDeckAncestorIds(input, "2")).toEqual(["1"]);
  });

  it("returns empty array when node not found", () => {
    const input = [node("1", "Root")];
    expect(getDeckAncestorIds(input, "999")).toEqual([]);
  });
});
