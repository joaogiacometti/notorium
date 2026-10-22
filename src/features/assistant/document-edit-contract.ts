import { z } from "zod";
import { STUDY_CONTEXT_MAX_CHARS } from "@/features/assistant/study-context";
import {
  MINDMAP_EDGE_DIRECTIONS,
  MINDMAP_NODE_COLOR_TOKENS,
} from "@/features/mindmaps/constants";
import { LIMITS, SUBJECT_PATH_MAX_CHARS } from "@/lib/config/limits";

const reference = z.string().min(1).max(100);
const sessionFields = {
  sessionId: reference,
  revision: z.number().int().nonnegative(),
};
const title = z.string().trim().min(1).max(LIMITS.noteTitleMax);
const draftFields = {
  ...sessionFields,
  title: z.string().max(200),
  partial: z.boolean(),
  subjectPath: z.string().max(SUBJECT_PATH_MAX_CHARS).optional(),
};

export const noteBlockSchema = z.object({
  id: reference,
  html: z.string().max(STUDY_CONTEXT_MAX_CHARS),
});
export const documentDraftSchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("note"),
      ...draftFields,
      blocks: z.array(noteBlockSchema).max(1000),
    }),
    z.object({
      kind: z.literal("mindmap"),
      ...draftFields,
      nodes: z
        .array(
          z.object({
            id: reference,
            label: z.string().max(LIMITS.mindmapNodeLabelMax),
            root: z.boolean(),
            completeSubtree: z.boolean(),
            color: z.enum(MINDMAP_NODE_COLOR_TOKENS).optional(),
            bold: z.literal(true).optional(),
            italic: z.literal(true).optional(),
          }),
        )
        .max(LIMITS.maxNodesPerMindmap),
      // Hue of each color slot in the user's current theme.
      palette: z
        .array(
          z.object({
            token: z.enum(MINDMAP_NODE_COLOR_TOKENS),
            hue: z.string().max(20),
          }),
        )
        .max(MINDMAP_NODE_COLOR_TOKENS.length)
        .optional(),
      edges: z
        .array(
          z.object({
            id: reference,
            source: reference,
            target: reference,
            cross: z.boolean(),
            label: z.string().max(LIMITS.mindmapEdgeLabelMax).optional(),
            direction: z.enum(MINDMAP_EDGE_DIRECTIONS).optional(),
          }),
        )
        .max(2000),
    }),
  ])
  .refine(
    (draft) =>
      JSON.stringify(
        draft.kind === "note"
          ? draft.blocks
          : { nodes: draft.nodes, edges: draft.edges },
      ).length <= STUDY_CONTEXT_MAX_CHARS,
    { message: "Expected document context within 12000 characters" },
  );

// Tool input schemas stay flat: no unions, `const`, or nullable fields. Gemini
// function calling accepts only an OpenAPI subset without `oneOf`/`const`, so a
// discriminated union reaches it without per-kind fields and its first call
// fails validation. Each operation kind is its own optional array instead.
const DOCUMENT_EDITS_MAX = 30;
const editList = <T extends z.ZodType>(item: T) =>
  z.array(item).max(DOCUMENT_EDITS_MAX).optional();
function countEdits(lists: (unknown[] | undefined)[]): number {
  return lists.reduce((total, list) => total + (list?.length ?? 0), 0);
}

// Block ids exist only in one captured editor revision; they never enter stored HTML.
export const noteEditsInputSchema = z
  .object({
    ...sessionFields,
    title: title.optional(),
    replacements: editList(
      z.object({
        firstBlockId: reference,
        lastBlockId: reference,
        html: z.string().max(LIMITS.assistantReplyMaxChars),
      }),
    ),
    insertions: editList(
      z.object({
        // Omitted only when the note is empty.
        anchorBlockId: reference.optional(),
        side: z.enum(["before", "after"]),
        html: z.string().min(1).max(LIMITS.assistantReplyMaxChars),
      }),
    ),
  })
  .refine(
    (input) =>
      input.title !== undefined ||
      countEdits([input.replacements, input.insertions]) > 0,
    { message: "Expected a title, replacement, or insertion" },
  )
  .refine(
    (input) =>
      countEdits([input.replacements, input.insertions]) <= DOCUMENT_EDITS_MAX,
    { message: `Expected at most ${DOCUMENT_EDITS_MAX} block edits` },
  );

const label = z.string().max(LIMITS.mindmapNodeLabelMax);
const connectionFields = {
  label: z.string().max(LIMITS.mindmapEdgeLabelMax),
  direction: z.enum(MINDMAP_EDGE_DIRECTIONS),
};
const mindmapEditListShape = {
  addNodes: editList(z.object({ id: reference, parentId: reference, label })),
  renameNodes: editList(z.object({ nodeId: reference, label })),
  styleNodes: editList(
    z.object({
      nodeId: reference,
      // "none" clears the tint; omitted fields keep their current value.
      color: z.enum([...MINDMAP_NODE_COLOR_TOKENS, "none"]).optional(),
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
    }),
  ),
  moveNodes: editList(z.object({ nodeId: reference, parentId: reference })),
  connect: editList(
    z.object({ source: reference, target: reference, ...connectionFields }),
  ),
  updateConnections: editList(
    z.object({ edgeId: reference, ...connectionFields }),
  ),
  disconnect: editList(z.object({ edgeId: reference })),
  removeNodes: editList(z.object({ nodeId: reference })),
};
type MindmapEditListKey = keyof typeof mindmapEditListShape;
const MINDMAP_EDIT_LIST_KEYS = Object.keys(
  mindmapEditListShape,
) as MindmapEditListKey[];

export const mindmapEditsInputSchema = z
  .object({ ...sessionFields, ...mindmapEditListShape })
  .refine(
    (input) => {
      const total = countEdits(MINDMAP_EDIT_LIST_KEYS.map((key) => input[key]));
      return total > 0 && total <= DOCUMENT_EDITS_MAX;
    },
    { message: `Expected 1 to ${DOCUMENT_EDITS_MAX} mindmap operations` },
  );
export const documentEditsOutputSchema = z.object({
  outcome: z.enum(["accepted", "discarded", "skipped", "stale"]),
});

export type DocumentDraft = z.infer<typeof documentDraftSchema>;
export type NoteDraft = Extract<DocumentDraft, { kind: "note" }>;
export type MindmapDraft = Extract<DocumentDraft, { kind: "mindmap" }>;
export type NoteEditsInput = z.infer<typeof noteEditsInputSchema>;
export type MindmapEditsInput = z.infer<typeof mindmapEditsInputSchema>;
// Operation kind for each proposal list, in application order: additions first
// so later lists can reference new-node aliases, removals last so nothing
// targets a node that was already deleted.
const MINDMAP_OPERATION_KINDS = {
  addNodes: "add",
  renameNodes: "rename",
  styleNodes: "style",
  moveNodes: "move",
  connect: "connect",
  updateConnections: "updateConnection",
  disconnect: "disconnect",
  removeNodes: "remove",
} as const satisfies Record<MindmapEditListKey, string>;
type MindmapEditLists = Required<Pick<MindmapEditsInput, MindmapEditListKey>>;
/** One mindmap operation tagged with its kind. */
export type MindmapOperation = {
  [K in MindmapEditListKey]: {
    kind: (typeof MINDMAP_OPERATION_KINDS)[K];
  } & MindmapEditLists[K][number];
}[MindmapEditListKey];

/**
 * Flatten a proposal into one operation sequence in application order.
 *
 * @example
 * for (const operation of mindmapOperationsInOrder(input)) apply(operation);
 */
export function mindmapOperationsInOrder(
  input: MindmapEditsInput,
): MindmapOperation[] {
  return MINDMAP_EDIT_LIST_KEYS.flatMap((key) =>
    (input[key] ?? []).map(
      (operation) =>
        ({
          kind: MINDMAP_OPERATION_KINDS[key],
          ...operation,
        }) as MindmapOperation,
    ),
  );
}
export type DocumentEditOutcome = z.infer<
  typeof documentEditsOutputSchema
>["outcome"];
