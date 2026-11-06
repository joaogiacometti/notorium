import type { FolderTreeNode } from "@/lib/server/api-contracts";

export function normalizeFolderTree(
  nodes: FolderTreeNode[],
  parentPath?: string,
): FolderTreeNode[] {
  return nodes.map((node) => {
    const normalizedChildren = normalizeFolderTree(
      node.children,
      parentPath ? `${parentPath}::${node.name}` : node.name,
    );
    const previousChildCount = node.children.reduce(
      (total, childNode) => total + childNode.documentCount,
      0,
    );
    const previousChildDueCount = node.children.reduce(
      (total, childNode) => total + childNode.dueFlashcardCount,
      0,
    );
    const directDocumentCount = Math.max(
      0,
      node.documentCount - previousChildCount,
    );
    const directDueCount = Math.max(
      0,
      node.dueFlashcardCount - previousChildDueCount,
    );
    const nextPath = parentPath ? `${parentPath}::${node.name}` : node.name;
    const nextDocumentCount =
      directDocumentCount +
      normalizedChildren.reduce(
        (total, childNode) => total + childNode.documentCount,
        0,
      );
    const nextDueFlashcardCount =
      directDueCount +
      normalizedChildren.reduce(
        (total, childNode) => total + childNode.dueFlashcardCount,
        0,
      );

    return {
      ...node,
      children: normalizedChildren,
      path: nextPath,
      documentCount: nextDocumentCount,
      dueFlashcardCount: nextDueFlashcardCount,
    };
  });
}

export function findFolderTreeNode(
  nodes: FolderTreeNode[],
  folderId: string,
): FolderTreeNode | null {
  for (const node of nodes) {
    if (node.id === folderId) {
      return node;
    }

    const childMatch = findFolderTreeNode(node.children, folderId);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

export function isFolderDescendant(
  nodes: FolderTreeNode[],
  ancestorId: string,
  targetId: string,
): boolean {
  const ancestor = findFolderTreeNode(nodes, ancestorId);
  if (!ancestor) {
    return false;
  }

  return findFolderTreeNode(ancestor.children, targetId) !== null;
}

function extractFolderTreeNode(
  nodes: FolderTreeNode[],
  folderId: string,
): {
  nextNodes: FolderTreeNode[];
  removedNode: FolderTreeNode | null;
} {
  let removedNode: FolderTreeNode | null = null;
  const nextNodes: FolderTreeNode[] = [];

  for (const node of nodes) {
    if (node.id === folderId) {
      removedNode = node;
      continue;
    }

    const extractedChild = extractFolderTreeNode(node.children, folderId);
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

function sortFolderTreeNodes(nodes: FolderTreeNode[]): FolderTreeNode[] {
  return [...nodes].sort((left, right) => left.name.localeCompare(right.name));
}

export function insertFolderTreeNode(
  nodes: FolderTreeNode[],
  nodeToInsert: FolderTreeNode,
  parentFolderId: string | null,
): FolderTreeNode[] {
  if (parentFolderId === null) {
    return sortFolderTreeNodes([
      ...nodes,
      {
        ...nodeToInsert,
        parentFolderId: null,
      },
    ]);
  }

  return nodes.map((node) => {
    if (node.id === parentFolderId) {
      return {
        ...node,
        children: sortFolderTreeNodes([
          ...node.children,
          {
            ...nodeToInsert,
            parentFolderId,
          },
        ]),
      };
    }

    return {
      ...node,
      children: insertFolderTreeNode(
        node.children,
        nodeToInsert,
        parentFolderId,
      ),
    };
  });
}

export function moveFolderTreeNode(
  nodes: FolderTreeNode[],
  folderId: string,
  parentFolderId: string | null,
): FolderTreeNode[] {
  const extracted = extractFolderTreeNode(nodes, folderId);
  if (!extracted.removedNode) {
    return nodes;
  }

  return normalizeFolderTree(
    insertFolderTreeNode(
      extracted.nextNodes,
      extracted.removedNode,
      parentFolderId,
    ),
  );
}

export function getFolderAncestorIds(
  nodes: FolderTreeNode[],
  folderId: string,
): string[] {
  for (const node of nodes) {
    if (node.id === folderId) {
      return [];
    }

    const childAncestors = getFolderAncestorIds(node.children, folderId);
    if (childAncestors.length > 0) {
      return [node.id, ...childAncestors];
    }

    if (node.children.some((child) => child.id === folderId)) {
      return [node.id];
    }
  }

  return [];
}
