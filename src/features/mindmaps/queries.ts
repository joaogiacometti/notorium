import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { mindmap, subject } from "@/db/schema";
import { countMindmapNodes } from "@/features/mindmaps/utils";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import type {
  MindmapEntity,
  MindmapListItem,
} from "@/lib/server/api-contracts";

export async function getMindmapsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<MindmapListItem[]> {
  const rows = await getDb()
    .select({
      id: mindmap.id,
      title: mindmap.title,
      updatedAt: mindmap.updatedAt,
      data: mindmap.data,
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

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
    nodeCount: countMindmapNodes(row.data),
  }));
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
