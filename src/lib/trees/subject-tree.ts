import type { SubjectTreeNode } from "@/lib/server/api-contracts";

export function normalizeSubjectTree(
  nodes: SubjectTreeNode[],
  parentPath?: string,
): SubjectTreeNode[] {
  return nodes.map((node) => {
    const normalizedChildren = normalizeSubjectTree(
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

export function findSubjectTreeNode(
  nodes: SubjectTreeNode[],
  subjectId: string,
): SubjectTreeNode | null {
  for (const node of nodes) {
    if (node.id === subjectId) {
      return node;
    }

    const childMatch = findSubjectTreeNode(node.children, subjectId);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

export function isSubjectDescendant(
  nodes: SubjectTreeNode[],
  ancestorId: string,
  targetId: string,
): boolean {
  const ancestor = findSubjectTreeNode(nodes, ancestorId);
  if (!ancestor) {
    return false;
  }

  return findSubjectTreeNode(ancestor.children, targetId) !== null;
}

function extractSubjectTreeNode(
  nodes: SubjectTreeNode[],
  subjectId: string,
): {
  nextNodes: SubjectTreeNode[];
  removedNode: SubjectTreeNode | null;
} {
  let removedNode: SubjectTreeNode | null = null;
  const nextNodes: SubjectTreeNode[] = [];

  for (const node of nodes) {
    if (node.id === subjectId) {
      removedNode = node;
      continue;
    }

    const extractedChild = extractSubjectTreeNode(node.children, subjectId);
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

function sortSubjectTreeNodes(nodes: SubjectTreeNode[]): SubjectTreeNode[] {
  return [...nodes].sort((left, right) => left.name.localeCompare(right.name));
}

export function insertSubjectTreeNode(
  nodes: SubjectTreeNode[],
  nodeToInsert: SubjectTreeNode,
  parentSubjectId: string | null,
): SubjectTreeNode[] {
  if (parentSubjectId === null) {
    return sortSubjectTreeNodes([
      ...nodes,
      {
        ...nodeToInsert,
        parentSubjectId: null,
      },
    ]);
  }

  return nodes.map((node) => {
    if (node.id === parentSubjectId) {
      return {
        ...node,
        children: sortSubjectTreeNodes([
          ...node.children,
          {
            ...nodeToInsert,
            parentSubjectId,
          },
        ]),
      };
    }

    return {
      ...node,
      children: insertSubjectTreeNode(
        node.children,
        nodeToInsert,
        parentSubjectId,
      ),
    };
  });
}

export function moveSubjectTreeNode(
  nodes: SubjectTreeNode[],
  subjectId: string,
  parentSubjectId: string | null,
): SubjectTreeNode[] {
  const extracted = extractSubjectTreeNode(nodes, subjectId);
  if (!extracted.removedNode) {
    return nodes;
  }

  return normalizeSubjectTree(
    insertSubjectTreeNode(
      extracted.nextNodes,
      extracted.removedNode,
      parentSubjectId,
    ),
  );
}

export function getSubjectAncestorIds(
  nodes: SubjectTreeNode[],
  subjectId: string,
): string[] {
  for (const node of nodes) {
    if (node.id === subjectId) {
      return [];
    }

    const childAncestors = getSubjectAncestorIds(node.children, subjectId);
    if (childAncestors.length > 0) {
      return [node.id, ...childAncestors];
    }

    if (node.children.some((child) => child.id === subjectId)) {
      return [node.id];
    }
  }

  return [];
}
