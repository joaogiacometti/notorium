import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { assessment, assessmentAttachment, subject } from "@/db/schema";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import type { AssessmentAttachmentEntity } from "@/lib/server/api-contracts";

export async function countAssessmentAttachmentsForUser(
  userId: string,
  assessmentId: string,
): Promise<number> {
  const rows = await getAssessmentAttachmentsForUser(userId, assessmentId);
  return rows.length;
}

export async function getAssessmentAttachmentsForUser(
  userId: string,
  assessmentId: string,
): Promise<AssessmentAttachmentEntity[]> {
  return getDb()
    .select({ attachment: assessmentAttachment })
    .from(assessmentAttachment)
    .innerJoin(assessment, eq(assessmentAttachment.assessmentId, assessment.id))
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        eq(assessmentAttachment.userId, userId),
        eq(assessmentAttachment.assessmentId, assessmentId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .orderBy(assessmentAttachment.createdAt)
    .then((rows) => rows.map((row) => row.attachment));
}

export async function getAssessmentAttachmentsForAssessments(
  userId: string,
  assessmentIds: string[],
): Promise<AssessmentAttachmentEntity[]> {
  if (assessmentIds.length === 0) {
    return [];
  }

  return getDb()
    .select({ attachment: assessmentAttachment })
    .from(assessmentAttachment)
    .innerJoin(assessment, eq(assessmentAttachment.assessmentId, assessment.id))
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        eq(assessmentAttachment.userId, userId),
        inArray(assessmentAttachment.assessmentId, assessmentIds),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .then((rows) => rows.map((row) => row.attachment));
}

export async function getAssessmentAttachmentForUser(
  userId: string,
  attachmentId: string,
): Promise<AssessmentAttachmentEntity | null> {
  const rows = await getDb()
    .select({ attachment: assessmentAttachment })
    .from(assessmentAttachment)
    .innerJoin(assessment, eq(assessmentAttachment.assessmentId, assessment.id))
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        eq(assessmentAttachment.id, attachmentId),
        eq(assessmentAttachment.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .limit(1);

  return rows[0]?.attachment ?? null;
}
