import { describe, expect, it } from "vitest";
import {
  buildDeckViewHref,
  getTotalFlashcardsCount,
  getVisibleExpandedIds,
  incrementDeckTreeFlashcardCount,
} from "@/components/decks/deck-tree-sidebar-utils";
import type { DeckTreeNode } from "@/lib/server/api-contracts";

function makeNode(
  overrides: Partial<DeckTreeNode> & Pick<DeckTreeNode, "id" | "name">,
): DeckTreeNode {
  return {
    parentDeckId: null,
    userId: "user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    flashcardCount: 0,
    children: [],
    path: overrides.name,
    ...overrides,
  };
}

describe("getTotalFlashcardsCount", () => {
  it("sums the top-level subtree counts", () => {
    const tree = [
      makeNode({ id: "a", name: "A", flashcardCount: 2 }),
      makeNode({ id: "b", name: "B", flashcardCount: 3 }),
    ];
    expect(getTotalFlashcardsCount(tree)).toBe(5);
  });
});

describe("buildDeckViewHref", () => {
  it("includes the deck id when provided", () => {
    expect(buildDeckViewHref("manage", "deck-1")).toBe(
      "/flashcards?view=manage&deckId=deck-1",
    );
  });

  it("omits the deck id when absent", () => {
    expect(buildDeckViewHref("review")).toBe("/flashcards?view=review");
  });
});

describe("incrementDeckTreeFlashcardCount", () => {
  const tree = [
    makeNode({
      id: "parent",
      name: "Parent",
      flashcardCount: 1,
      children: [makeNode({ id: "child", name: "Child", flashcardCount: 0 })],
    }),
    makeNode({ id: "other", name: "Other", flashcardCount: 5 }),
  ];

  it("bumps the deck and its ancestors", () => {
    const next = incrementDeckTreeFlashcardCount(tree, "child");
    expect(next[0]?.flashcardCount).toBe(2);
    expect(next[0]?.children[0]?.flashcardCount).toBe(1);
  });

  it("leaves unrelated branches referentially unchanged", () => {
    const next = incrementDeckTreeFlashcardCount(tree, "child");
    expect(next[1]).toBe(tree[1]);
  });
});

describe("getVisibleExpandedIds", () => {
  const tree = [
    makeNode({
      id: "p",
      name: "Parent",
      children: [makeNode({ id: "c", name: "Child" })],
    }),
  ];

  it("returns the manual set unchanged when there is no query", () => {
    const manual = new Set(["p"]);
    const result = getVisibleExpandedIds(manual, tree, "");
    expect(result).toEqual(new Set(["p"]));
  });

  it("force-expands matching branches while searching", () => {
    const result = getVisibleExpandedIds(new Set(), tree, "Child");
    expect(result.has("p")).toBe(true);
  });
});
