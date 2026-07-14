import type { getDb } from "@/db/index";
import { subject } from "@/db/schema";
import type { SubjectKind } from "@/features/subjects/constants";
import { isUniqueViolationError } from "@/lib/db/errors";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

type SubjectInsertExecutor = Pick<ReturnType<typeof getDb>, "insert">;

export interface SubjectInsertData {
  name: string;
  kind: SubjectKind;
  parentSubjectId?: string;
}

/**
 * Inserts one owned subject and returns its required identifier.
 *
 * @example await insertSubjectRow(db, userId, { name: "Math", kind: "academic" });
 */
export async function insertSubjectRow(
  executor: SubjectInsertExecutor,
  userId: string,
  input: SubjectInsertData,
): Promise<string> {
  const [inserted] = await executor
    .insert(subject)
    .values({
      name: input.name.trim(),
      kind: input.kind,
      parentSubjectId: input.parentSubjectId ?? null,
      userId,
    })
    .returning({ id: subject.id });

  if (!inserted) {
    throw new Error(
      `Subject insert for user ${userId} and name ${input.name} returned no id; expected one inserted subject row.`,
    );
  }

  return inserted.id;
}

/**
 * Maps a subject-name constraint failure to the public duplicate error.
 *
 * @example resolveSubjectUniqueError({ code: "23505" });
 */
export function resolveSubjectUniqueError(
  error: unknown,
): ActionErrorResult | null {
  return isUniqueViolationError(error)
    ? actionError("subjects.duplicateName")
    : null;
}
