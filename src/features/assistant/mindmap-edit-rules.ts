import type {
  MindmapDraft,
  MindmapEditsInput,
} from "@/features/assistant/document-edit-contract";
import {
  findDraftIdentityProblems,
  findUnknownIdProblems,
} from "@/features/assistant/edit-guards";

type DraftNode = MindmapDraft["nodes"][number];
type StyleEdit = NonNullable<MindmapEditsInput["styleNodes"]>[number];

/**
 * Every rule a mindmap proposal breaks against the draft the model was shown,
 * phrased as "<problem>; expected <shape>". Unknown ids are reported alone:
 * every other rule depends on resolving them.
 *
 * @example
 * guardEditSchema(mindmapEditsInputSchema, [(input) => findMindmapEditProblems(input, draft)]);
 */
export function findMindmapEditProblems(
  input: MindmapEditsInput,
  draft: MindmapDraft,
): string[] {
  const identity = findDraftIdentityProblems(input, draft);
  const unknown = findUnknownReferences(input, draft);
  if (unknown.length > 0) return [...identity, ...unknown];
  return [
    ...identity,
    ...findAliasProblems(input, draft),
    ...findRootAndSubtreeProblems(input, draft),
    ...findUnchangedNodeEdits(input, draft),
    ...findMoveCycles(input, draft),
    ...findConnectionProblems(input, draft),
  ];
}

function findUnknownReferences(
  input: MindmapEditsInput,
  draft: MindmapDraft,
): string[] {
  const nodeIds = [
    ...draft.nodes.map((node) => node.id),
    ...(input.addNodes ?? []).map((node) => node.id),
  ];
  const referencedEdges = [
    ...(input.updateConnections ?? []).map((edit) => edit.edgeId),
    ...(input.disconnect ?? []).map((edit) => edit.edgeId),
  ];
  const crossEdgeIds = draft.edges
    .filter((edge) => edge.cross)
    .map((edge) => edge.id);
  return [
    ...findUnknownIdProblems("node", referencedNodeIds(input), nodeIds),
    ...findUnknownIdProblems("cross-connection", referencedEdges, crossEdgeIds),
  ];
}

function referencedNodeIds(input: MindmapEditsInput): string[] {
  return [
    ...(input.addNodes ?? []).map((edit) => edit.parentId),
    ...(input.renameNodes ?? []).map((edit) => edit.nodeId),
    ...(input.styleNodes ?? []).map((edit) => edit.nodeId),
    ...(input.moveNodes ?? []).flatMap((edit) => [edit.nodeId, edit.parentId]),
    ...(input.connect ?? []).flatMap((edit) => [edit.source, edit.target]),
    ...(input.removeNodes ?? []).map((edit) => edit.nodeId),
  ];
}

function findAliasProblems(
  input: MindmapEditsInput,
  draft: MindmapDraft,
): string[] {
  const aliases = (input.addNodes ?? []).map((node) => node.id);
  return aliases
    .filter(
      (id, index) =>
        aliases.indexOf(id) !== index ||
        draft.nodes.some((node) => node.id === id),
    )
    .map(
      (id) =>
        `New node id ${id} is already used; expected a unique new alias for each added node`,
    );
}

function findRootAndSubtreeProblems(
  input: MindmapEditsInput,
  draft: MindmapDraft,
): string[] {
  const targets = [
    ...(input.styleNodes ?? []).map((edit) => ["style", edit.nodeId]),
    ...(input.moveNodes ?? []).map((edit) => ["move", edit.nodeId]),
    ...(input.removeNodes ?? []).map((edit) => ["remove", edit.nodeId]),
  ];
  return targets.flatMap(([kind, id]) => {
    const node = draft.nodes.find((entry) => entry.id === id);
    if (node?.root)
      return [
        `Cannot ${kind} root ${id}; expected a non-root node (rename the root to change the title)`,
      ];
    if (kind === "remove" && node && !node.completeSubtree)
      return [
        `Node ${id} has descendants outside the draft; expected removal of complete subtrees only`,
      ];
    return [];
  });
}

function findUnchangedNodeEdits(
  input: MindmapEditsInput,
  draft: MindmapDraft,
): string[] {
  const node = (id: string) => draft.nodes.find((entry) => entry.id === id);
  const renames = (input.renameNodes ?? []).filter(
    (edit) => node(edit.nodeId)?.label.trim() === edit.label.trim(),
  );
  const styles = (input.styleNodes ?? []).filter((edit) =>
    isUnchangedStyle(edit, node(edit.nodeId)),
  );
  const moves = (input.moveNodes ?? []).filter(
    (edit) => parentOf(draft, edit.nodeId) === edit.parentId,
  );
  return [
    ...renames.map(
      (edit) =>
        `Rename of ${edit.nodeId} keeps its label; expected a different label`,
    ),
    ...styles.map(
      (edit) =>
        `Style of ${edit.nodeId} keeps its look; expected a changed color, bold, or italic`,
    ),
    ...moves.map(
      (edit) =>
        `Move of ${edit.nodeId} keeps parent ${edit.parentId}; expected a different parent`,
    ),
  ];
}

function isUnchangedStyle(edit: StyleEdit, node: DraftNode | undefined) {
  if (!node) return false;
  const color =
    edit.color === undefined ||
    (edit.color === "none" ? !node.color : edit.color === node.color);
  const flag = (value: boolean | undefined, current: true | undefined) =>
    value === undefined || value === (current === true);
  return color && flag(edit.bold, node.bold) && flag(edit.italic, node.italic);
}

function findMoveCycles(
  input: MindmapEditsInput,
  draft: MindmapDraft,
): string[] {
  return (input.moveNodes ?? [])
    .filter((edit) => subtreeOf(draft, edit.nodeId).has(edit.parentId))
    .map(
      (edit) =>
        `Move of ${edit.nodeId} under ${edit.parentId} is inside its own subtree; expected a parent outside that branch`,
    );
}

function findConnectionProblems(
  input: MindmapEditsInput,
  draft: MindmapDraft,
): string[] {
  const connects = (input.connect ?? []).flatMap((edit) => {
    if (edit.source === edit.target)
      return [
        `Connection ${edit.source}:${edit.target} links a node to itself; expected distinct nodes`,
      ];
    const existing = findCrossConnection(draft, edit.source, edit.target);
    if (!existing) return [];
    return [
      `Nodes ${edit.source} and ${edit.target} are already connected by ${existing.id}; expected updateConnections for that edge`,
    ];
  });
  return [...connects, ...findUnchangedConnections(input, draft)];
}

function findUnchangedConnections(
  input: MindmapEditsInput,
  draft: MindmapDraft,
): string[] {
  return (input.updateConnections ?? [])
    .filter((edit) => {
      const edge = draft.edges.find((entry) => entry.id === edit.edgeId);
      return (
        (edge?.label ?? "") === edit.label &&
        (edge?.direction ?? "none") === edit.direction
      );
    })
    .map(
      (edit) =>
        `Update of ${edit.edgeId} keeps its label and direction; expected a change`,
    );
}

function findCrossConnection(
  draft: MindmapDraft,
  first: string,
  second: string,
): MindmapDraft["edges"][number] | undefined {
  const pair = [first, second].sort().join();
  return draft.edges.find(
    (edge) => edge.cross && [edge.source, edge.target].sort().join() === pair,
  );
}

function parentOf(draft: MindmapDraft, nodeId: string): string | undefined {
  return draft.edges.find((edge) => !edge.cross && edge.target === nodeId)
    ?.source;
}

function subtreeOf(draft: MindmapDraft, nodeId: string): Set<string> {
  const subtree = new Set([nodeId]);
  for (const id of subtree)
    for (const edge of draft.edges)
      if (!edge.cross && edge.source === id) subtree.add(edge.target);
  return subtree;
}
