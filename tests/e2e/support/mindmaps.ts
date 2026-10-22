import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { mindmap } from "@/db/schema";

/** Seed a map with a root and branch for editor persistence tests.
 * @example const map = await createAssistantTestMindmap(userId, subjectId);
 */
export async function createAssistantTestMindmap(
  userId: string,
  subjectId: string,
): Promise<{ id: string }> {
  const [created] = await getDb()
    .insert(mindmap)
    .values({
      userId,
      subjectId,
      title: "Original map",
      data: JSON.stringify({
        nodes: [
          {
            id: "root",
            position: { x: 0, y: 0 },
            data: { kind: "root", label: "Original map" },
          },
          {
            id: "branch",
            position: { x: 210, y: 0 },
            data: { label: "Original branch" },
          },
        ],
        edges: [
          {
            id: "tree",
            source: "root",
            target: "branch",
            sourceHandle: "r-source",
            targetHandle: "l-target",
          },
        ],
      }),
    })
    .returning({ id: mindmap.id });
  return created;
}

/** Read persisted map state independently of the client preview.
 * @example const saved = await readAssistantTestMindmap(userId, id);
 */
export async function readAssistantTestMindmap(
  userId: string,
  id: string,
): Promise<{ title: string; data: string | null } | null> {
  const [saved] = await getDb()
    .select({ title: mindmap.title, data: mindmap.data })
    .from(mindmap)
    .where(and(eq(mindmap.userId, userId), eq(mindmap.id, id)));
  return saved ?? null;
}
