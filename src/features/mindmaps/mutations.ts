import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { mindmap } from "@/db/schema";
import { cleanupAttachmentPathnames } from "@/features/attachments/cleanup";
import type {
  MoveDocumentMutationInput,
  MoveDocumentResult,
} from "@/features/documents/types";
import {
  countMindmapsBySubjectForUser,
  getMindmapByIdForUser,
} from "@/features/mindmaps/queries";
import { splitMindmapGraph } from "@/features/mindmaps/split";
import {
  getMindmapImagePathnames,
  getRemovedMindmapImagePathnames,
} from "@/features/mindmaps/utils";
import type {
  CreateMindmapForm,
  DeleteMindmapForm,
  EditMindmapForm,
  EditMindmapTitleForm,
  SplitMindmapForm,
} from "@/features/mindmaps/validation";
import { getSubjectRecordForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type CreateMindmapMutationResult =
  | {
      success: true;
      mindmapId: string;
      subjectId: string;
    }
  | ActionErrorResult;

export type MindmapMutationResult =
  | {
      success: true;
      mindmapId: string;
      subjectId: string;
    }
  | ActionErrorResult;

export async function createMindmapForUser(
  userId: string,
  data: CreateMindmapForm,
): Promise<CreateMindmapMutationResult> {
  const existingSubject = await getSubjectRecordForUser(userId, data.subjectId);
  const current = await countMindmapsBySubjectForUser(userId, data.subjectId);

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  if (current >= LIMITS.maxMindmapsPerSubject) {
    return actionError("limits.mindmapLimit", {
      errorParams: { max: LIMITS.maxMindmapsPerSubject },
    });
  }

  const mindmapId = crypto.randomUUID();

  await getDb().insert(mindmap).values({
    id: mindmapId,
    title: data.title,
    data: null,
    subjectId: data.subjectId,
    userId,
  });

  return { success: true, mindmapId, subjectId: data.subjectId };
}

export async function editMindmapForUser(
  userId: string,
  data: EditMindmapForm,
): Promise<MindmapMutationResult> {
  const existing = await getMindmapByIdForUser(userId, data.id);

  if (!existing) {
    return actionError("mindmaps.notFound");
  }

  await getDb()
    .update(mindmap)
    .set({ title: data.title, data: data.data })
    .where(and(eq(mindmap.id, data.id), eq(mindmap.userId, userId)));

  // Remove blobs for node images dropped in this edit.
  await cleanupAttachmentPathnames(
    userId,
    getRemovedMindmapImagePathnames(existing.data, data.data),
  );

  return { success: true, mindmapId: data.id, subjectId: existing.subjectId };
}

export async function splitMindmapForUser(
  userId: string,
  data: SplitMindmapForm,
): Promise<CreateMindmapMutationResult> {
  const existing = await getMindmapByIdForUser(userId, data.id);

  if (!existing) {
    return actionError("mindmaps.notFound");
  }

  const current = await countMindmapsBySubjectForUser(
    userId,
    existing.subjectId,
  );
  if (current >= LIMITS.maxMindmapsPerSubject) {
    return actionError("limits.mindmapLimit", {
      errorParams: { max: LIMITS.maxMindmapsPerSubject },
    });
  }

  const split = splitMindmapGraph(JSON.parse(data.data), data.nodeId);
  if (!split) {
    return actionError("mindmaps.invalidData");
  }

  const mindmapId = crypto.randomUUID();
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.insert(mindmap).values({
      id: mindmapId,
      title: split.title,
      data: JSON.stringify(split.splitGraph),
      subjectId: existing.subjectId,
      userId,
    });
    await tx
      .update(mindmap)
      .set({ data: JSON.stringify(split.remainingGraph) })
      .where(and(eq(mindmap.id, data.id), eq(mindmap.userId, userId)));
  });

  return { success: true, mindmapId, subjectId: existing.subjectId };
}

export async function editMindmapTitleForUser(
  userId: string,
  data: EditMindmapTitleForm,
): Promise<MindmapMutationResult> {
  const existing = await getMindmapByIdForUser(userId, data.id);

  if (!existing) {
    return actionError("mindmaps.notFound");
  }

  await getDb()
    .update(mindmap)
    .set({ title: data.title })
    .where(and(eq(mindmap.id, data.id), eq(mindmap.userId, userId)));

  return { success: true, mindmapId: data.id, subjectId: existing.subjectId };
}

/**
 * Reparents a mindmap to another subject (drag-and-drop in the tree). Enforces
 * ownership of both mindmap and target subject, and the target's mindmap limit.
 * A move to the current subject is a no-op success.
 */
export async function moveMindmapForUser(
  userId: string,
  data: MoveDocumentMutationInput,
): Promise<MoveDocumentResult> {
  const existing = await getMindmapByIdForUser(userId, data.id);

  if (!existing) {
    return actionError("mindmaps.notFound");
  }

  if (existing.subjectId === data.subjectId) {
    return {
      success: true,
      subjectId: data.subjectId,
      previousSubjectId: data.subjectId,
    };
  }

  const targetError = await validateMindmapMoveTarget(userId, data.subjectId);
  if (targetError) {
    return targetError;
  }

  await getDb()
    .update(mindmap)
    .set({ subjectId: data.subjectId })
    .where(and(eq(mindmap.id, data.id), eq(mindmap.userId, userId)));

  return {
    success: true,
    subjectId: data.subjectId,
    previousSubjectId: existing.subjectId,
  };
}

async function validateMindmapMoveTarget(
  userId: string,
  subjectId: string,
): Promise<ActionErrorResult | null> {
  const targetSubject = await getSubjectRecordForUser(userId, subjectId);
  if (!targetSubject) {
    return actionError("subjects.notFound");
  }

  const current = await countMindmapsBySubjectForUser(userId, subjectId);
  if (current >= LIMITS.maxMindmapsPerSubject) {
    return actionError("limits.mindmapLimit", {
      errorParams: { max: LIMITS.maxMindmapsPerSubject },
    });
  }

  return null;
}

export async function deleteMindmapForUser(
  userId: string,
  data: DeleteMindmapForm,
): Promise<MindmapMutationResult> {
  const existing = await getMindmapByIdForUser(userId, data.id);

  if (!existing) {
    return actionError("mindmaps.notFound");
  }

  await getDb()
    .delete(mindmap)
    .where(and(eq(mindmap.id, data.id), eq(mindmap.userId, userId)));

  // Remove blobs for any node images the deleted mindmap referenced.
  await cleanupAttachmentPathnames(
    userId,
    getMindmapImagePathnames(existing.data),
  );

  return { success: true, mindmapId: data.id, subjectId: existing.subjectId };
}
