/**
 * Throwaway benchmark for the /subjects/[id]/documents hot path.
 *
 * Seeds a representative subject (many notes + image-heavy mindmaps) into the
 * local test DB, then times getSubjectDocumentsForUser across many iterations.
 * Used to compare the JS-side node counting vs the SQL node count optimization.
 *
 * Run: bun --env-file=.env.test run scripts/bench-subject-documents.ts
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { mindmap, note, subject, user } from "@/db/schema";
import { getSubjectDocumentsForUser } from "@/features/documents/queries";

const USER_ID = "bench-user";
const SUBJECT_ID = "bench-subject";
const NOTE_COUNT = 40;
const MINDMAP_COUNT = 25;
const NODES_PER_MINDMAP = 400; // image-heavy graphs get large fast
const ITERATIONS = 50;

function buildMindmapData(nodeCount: number): string {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `n${i}`,
    position: { x: i * 12, y: i * 7 },
    data: {
      label: `Concept ${i} with a reasonably long descriptive label`,
      kind: i === 0 ? "root" : "topic",
      imageUrl: `/api/attachments/blob?pathname=img/${i}-${"x".repeat(64)}.png`,
    },
  }));
  const edges = Array.from({ length: nodeCount - 1 }, (_, i) => ({
    id: `e${i}`,
    source: `n${i}`,
    target: `n${i + 1}`,
  }));
  return JSON.stringify({ nodes, edges });
}

async function seed() {
  const db = getDb();
  await db.delete(user).where(eq(user.id, USER_ID));
  await db.insert(user).values({
    id: USER_ID,
    name: "Bench User",
    email: "bench@example.com",
    accessStatus: "approved",
  });
  await db.insert(subject).values({
    id: SUBJECT_ID,
    name: "Bench Subject",
    kind: "academic",
    userId: USER_ID,
  });

  const now = Date.now();
  await db.insert(note).values(
    Array.from({ length: NOTE_COUNT }, (_, i) => ({
      id: `bench-note-${i}`,
      title: `Note ${i}`,
      content: "lorem ipsum ".repeat(50),
      subjectId: SUBJECT_ID,
      userId: USER_ID,
      updatedAt: new Date(now - i * 1000),
    })),
  );

  const data = buildMindmapData(NODES_PER_MINDMAP);
  await db.insert(mindmap).values(
    Array.from({ length: MINDMAP_COUNT }, (_, i) => ({
      id: `bench-mindmap-${i}`,
      title: `Mindmap ${i}`,
      data,
      subjectId: SUBJECT_ID,
      userId: USER_ID,
      updatedAt: new Date(now - i * 1000),
    })),
  );
}

async function bench() {
  // Warm up the pool + caches.
  for (let i = 0; i < 5; i++) {
    await getSubjectDocumentsForUser(USER_ID, SUBJECT_ID);
  }

  const samples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    const docs = await getSubjectDocumentsForUser(USER_ID, SUBJECT_ID);
    samples.push(performance.now() - start);
    if (i === 0) {
      console.log(`  returned ${docs.length} documents`);
    }
  }

  samples.sort((a, b) => a - b);
  const sum = samples.reduce((t, v) => t + v, 0);
  const p = (q: number) => samples[Math.floor(samples.length * q)];
  console.log(
    `  mean=${(sum / samples.length).toFixed(2)}ms  ` +
      `p50=${p(0.5).toFixed(2)}ms  p95=${p(0.95).toFixed(2)}ms  ` +
      `min=${samples[0].toFixed(2)}ms  max=${samples.at(-1)?.toFixed(2)}ms`,
  );
}

async function main() {
  console.log("Seeding...");
  await seed();
  console.log(
    `Benchmarking getSubjectDocumentsForUser ` +
      `(${NOTE_COUNT} notes, ${MINDMAP_COUNT} mindmaps x ${NODES_PER_MINDMAP} nodes, ${ITERATIONS} iters):`,
  );
  await bench();
  process.exit(0);
}

main();
