import { z } from "zod";
import {
  MINDMAP_EDGE_DIRECTIONS,
  MINDMAP_NODE_COLOR_TOKENS,
} from "@/features/mindmaps/constants";
import { LIMITS } from "@/lib/config/limits";
import { validationMessage } from "@/lib/validations/validation-messages";

export const mindmapNodeSchema = z.object({
  id: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    label: z.string().max(LIMITS.mindmapNodeLabelMax),
    color: z.enum(MINDMAP_NODE_COLOR_TOKENS).optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    // The single root node sits at the center and stays in sync with the
    // mindmap title. Absence means a regular branch node. `image` is a
    // free-floating standalone image (pasted onto empty canvas), not part of the
    // hierarchy. Optional so legacy graphs validate without a migration.
    kind: z.enum(["root", "branch", "image"]).optional(),
    // Rendered size of an image node, persisted so a resize survives reloads.
    // Only set for `kind: "image"`; branch/root nodes auto-size to content.
    width: z.number().positive().max(4096).optional(),
    height: z.number().positive().max(4096).optional(),
    // Node image. Holds the internal attachment read URL
    // (`/api/attachments/blob?pathname=...`, relative) or an absolute http(s)
    // URL. Optional so text-only nodes and legacy graphs validate unchanged.
    imageUrl: z
      .string()
      .min(1)
      .max(2048)
      .refine(
        (value) =>
          value.startsWith("/api/attachments/") || /^https?:\/\//.test(value),
        { message: "Invalid image url" },
      )
      .optional(),
  }),
});

export const mindmapEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  // Which side handle each end attaches to (left/right flow + reconnection).
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().max(LIMITS.mindmapEdgeLabelMax).optional(),
  direction: z.enum(MINDMAP_EDGE_DIRECTIONS).optional(),
  // Persisted bend of the curve, stored as an offset from the edge's midpoint
  // so the shape survives node moves. Absent means a plain bezier.
  curveOffset: z.object({ x: z.number(), y: z.number() }).optional(),
  // True for user-drawn connections between existing nodes (cross-connections).
  // Absent/false for tree edges that define the parent-child hierarchy.
  cross: z.boolean().optional(),
});

export const mindmapGraphSchema = z.object({
  nodes: z.array(mindmapNodeSchema).max(
    LIMITS.maxNodesPerMindmap,
    validationMessage("Validation.mindmaps.tooManyNodes", {
      max: LIMITS.maxNodesPerMindmap,
    }),
  ),
  edges: z.array(mindmapEdgeSchema),
});

const mindmapTitleSchema = z
  .string()
  .min(1, validationMessage("Validation.mindmaps.titleRequired"))
  .max(
    LIMITS.mindmapTitleMax,
    validationMessage("Validation.mindmaps.titleMaxLength"),
  );

// `data` is stored as a JSON string (mirrors note.content as text). Validate
// the serialized size first, then ensure it parses into a valid graph.
const mindmapDataSchema = z
  .string()
  .max(
    LIMITS.mindmapDataMaxBytes,
    validationMessage("Validation.mindmaps.dataTooLarge"),
  )
  .superRefine((value, ctx) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: validationMessage("Validation.mindmaps.dataTooLarge"),
      });
      return;
    }

    const result = mindmapGraphSchema.safeParse(parsed);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message:
          result.error.issues[0]?.message ??
          validationMessage("Validation.mindmaps.dataTooLarge"),
      });
    }
  });

export const createMindmapSchema = z.object({
  title: mindmapTitleSchema,
  subjectId: z.string().min(1),
});

export type CreateMindmapForm = z.infer<typeof createMindmapSchema>;

export const editMindmapSchema = z.object({
  id: z.string().min(1),
  title: mindmapTitleSchema,
  data: mindmapDataSchema,
});

export type EditMindmapForm = z.infer<typeof editMindmapSchema>;

export const splitMindmapSchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1),
  data: mindmapDataSchema,
});

export type SplitMindmapForm = z.infer<typeof splitMindmapSchema>;

export const editMindmapTitleSchema = z.object({
  id: z.string().min(1),
  title: mindmapTitleSchema,
});

export type EditMindmapTitleForm = z.infer<typeof editMindmapTitleSchema>;

export const deleteMindmapSchema = z.object({
  id: z.string().min(1),
});

export type DeleteMindmapForm = z.infer<typeof deleteMindmapSchema>;
