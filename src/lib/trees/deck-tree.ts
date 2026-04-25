import type { DeckTreeNode } from "@/lib/server/api-contracts";

export function normalizeDeckTree(
  nodes: DeckTreeNode[],
  parentPath?: string,
): DeckTreeNode[] {
  return nodes.map((node) => {
    const normalizedChildren = normalizeDeckTree(
      node.children,
      parentPath ? `${parentPath}::${node.name}` : node.name,
    );
    const previousChildCount = node.children.reduce(
      (total, childNode) => total + childNode.flashcardCount,
      0,
    );
    const directFlashcardCount = Math.max(
      0,
      node.flashcardCount - previousChildCount,
    );
    const nextPath = parentPath ? `${parentPath}::${node.name}` : node.name;
    const nextFlashcardCount =
      directFlashcardCount +
      normalizedChildren.reduce(
        (total, childNode) => total + childNode.flashcardCount,
        0,
      );

    return {
      ...node,
      children: normalizedChildren,
      path: nextPath,
      flashcardCount: nextFlashcardCount,
    };
  });
}

export function updateDeckTreeNode(
  nodes: DeckTreeNode[],
  deckId: string,
  updater: (node: DeckTreeNode) => DeckTreeNode,
): DeckTreeNode[] {
  return nodes.map((node) => {
    const nextNode = node.id === deckId ? updater(node) : node;

    return {
      ...nextNode,
      children: updateDeckTreeNode(nextNode.children, deckId, updater),
    };
  });
}

export function removeDeckTreeNode(
  nodes: DeckTreeNode[],
  deckId: string,
): DeckTreeNode[] {
  return nodes
    .filter((node) => node.id !== deckId)
    .map((node) => ({
      ...node,
      children: removeDeckTreeNode(node.children, deckId),
    }));
}

export function findDeckTreeNode(
  nodes: DeckTreeNode[],
  deckId: string,
): DeckTreeNode | null {
  for (const node of nodes) {
    if (node.id === deckId) {
      return node;
    }

    const childMatch = findDeckTreeNode(node.children, deckId);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

export function isDeckDescendant(
  nodes: DeckTreeNode[],
  ancestorId: string,
  targetId: string,
): boolean {
  const ancestor = findDeckTreeNode(nodes, ancestorId);
  if (!ancestor) {
    return false;
  }

  return findDeckTreeNode(ancestor.children, targetId) !== null;
}

function extractDeckTreeNode(
  nodes: DeckTreeNode[],
  deckId: string,
): {
  nextNodes: DeckTreeNode[];
  removedNode: DeckTreeNode | null;
} {
  let removedNode: DeckTreeNode | null = null;
  const nextNodes: DeckTreeNode[] = [];

  for (const node of nodes) {
    if (node.id === deckId) {
      removedNode = node;
      continue;
    }

    const extractedChild = extractDeckTreeNode(node.children, deckId);
    if (extractedChild.removedNode) {
      removedNode = extractedChild.removedNode;
      nextNodes.push({
        ...node,
        children: extractedChild.nextNodes,
      });
      continue;
    }

    nextNodes.push(node);
  }

  return {
    nextNodes,
    removedNode,
  };
}

function sortDeckTreeNodes(nodes: DeckTreeNode[]): DeckTreeNode[] {
  return [...nodes].sort((left, right) => left.name.localeCompare(right.name));
}

export function insertDeckTreeNode(
  nodes: DeckTreeNode[],
  nodeToInsert: DeckTreeNode,
  parentDeckId: string | null,
): DeckTreeNode[] {
  if (parentDeckId === null) {
    return sortDeckTreeNodes([
      ...nodes,
      {
        ...nodeToInsert,
        parentDeckId: null,
      },
    ]);
  }

  return nodes.map((node) => {
    if (node.id === parentDeckId) {
      return {
        ...node,
        children: sortDeckTreeNodes([
          ...node.children,
          {
            ...nodeToInsert,
            parentDeckId,
          },
        ]),
      };
    }

    return {
      ...node,
      children: insertDeckTreeNode(node.children, nodeToInsert, parentDeckId),
    };
  });
}

export function moveDeckTreeNode(
  nodes: DeckTreeNode[],
  deckId: string,
  parentDeckId: string | null,
): DeckTreeNode[] {
  const extracted = extractDeckTreeNode(nodes, deckId);
  if (!extracted.removedNode) {
    return nodes;
  }

  return normalizeDeckTree(
    insertDeckTreeNode(
      extracted.nextNodes,
      extracted.removedNode,
      parentDeckId,
    ),
  );
}

export function filterDeckTree(
  nodes: DeckTreeNode[],
  query: string,
): DeckTreeNode[] {
  if (!query.trim()) {
    return nodes;
  }
  const lowerQuery = query.toLowerCase();
  return nodes
    .map((node) => {
      const filteredChildren = filterDeckTree(node.children, query);
      if (
        node.name.toLowerCase().includes(lowerQuery) ||
        filteredChildren.length > 0
      ) {
        return { ...node, children: filteredChildren };
      }
      return null;
    })
    .filter((node): node is DeckTreeNode => node !== null);
}

export function getExpandedIdsForVisibleTree(
  nodes: DeckTreeNode[],
): Set<string> {
  const expandedIds = new Set<string>();

  function visit(currentNodes: DeckTreeNode[]) {
    for (const node of currentNodes) {
      if (node.children.length > 0) {
        expandedIds.add(node.id);
        visit(node.children);
      }
    }
  }

  visit(nodes);

  return expandedIds;
}

export function getDeckAncestorIds(
  nodes: DeckTreeNode[],
  deckId: string,
): string[] {
  for (const node of nodes) {
    if (node.id === deckId) {
      return [];
    }

    const childAncestors = getDeckAncestorIds(node.children, deckId);
    if (childAncestors.length > 0) {
      return [node.id, ...childAncestors];
    }

    if (node.children.some((child) => child.id === deckId)) {
      return [node.id];
    }
  }

  return [];
}
