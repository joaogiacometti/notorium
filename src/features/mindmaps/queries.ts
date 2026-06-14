import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { mindmap, subject } from "@/db/schema";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import type {
  MindmapEntity,
  MindmapListItem,
} from "@/lib/server/api-contracts";

// Selects only list-preview columns, never the `data` graph blob. The subject
// documents list merges mindmaps and notes by recency and never needs the graph
// body, so pulling it (megabytes of JSON for image-heavy maps) just to drop it
// was the dominant cost of the /subjects/[id]/documents render.
export async function getMindmapsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<MindmapListItem[]> {
  return getDb()
    .select({
      id: mindmap.id,
      title: mindmap.title,
      updatedAt: mindmap.updatedAt,
    })
    .from(mindmap)
    .innerJoin(subject, eq(mindmap.subjectId, subject.id))
    .where(
      and(
        eq(mindmap.subjectId, subjectId),
        eq(mindmap.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .orderBy(desc(mindmap.updatedAt));
}

export async function getMindmapByIdForUser(
  userId: string,
  mindmapId: string,
): Promise<MindmapEntity | null> {
  const results = await getDb()
    .select({ mindmap })
    .from(mindmap)
    .innerJoin(subject, eq(mindmap.subjectId, subject.id))
    .where(
      and(
        eq(mindmap.id, mindmapId),
        eq(mindmap.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .limit(1);

  return results[0]?.mindmap ?? null;
}

export async function countMindmapsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(mindmap)
    .innerJoin(subject, eq(mindmap.subjectId, subject.id))
    .where(
      and(
        eq(mindmap.subjectId, subjectId),
        eq(mindmap.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    );

  return result[0]?.total ?? 0;
}
