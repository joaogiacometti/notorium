/**
 * Throwaway benchmark for the /flashcards/[flashcardId] hot path.
 *
 * Seeds a user with a large deck library (a forest of nested decks) and a
 * single flashcard, then times getFlashcardDetailByIdForUser. The detail page
 * needs only the one card's deck path, so this measures the cost of resolving
 * that path via the whole-library map vs. a single ancestor-chain walk.
 *
 * Run: bun --env-file=.env.test run scripts/bench-flashcard-detail.ts
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { deck, flashcard, user } from "@/db/schema";
import { getFlashcardDetailByIdForUser } from "@/features/flashcards/queries";

const USER_ID = "bench-fc-user";
const ROOT_DECKS = 40;
const DEPTH = 5; // chain length per root → ROOT_DECKS * DEPTH decks total
const ITERATIONS = 50;

async function seed(): Promise<string> {
  const db = getDb();
  await db.delete(user).where(eq(user.id, USER_ID));
  await db.insert(user).values({
    id: USER_ID,
    name: "Bench FC User",
    email: "bench-fc@example.com",
    accessStatus: "approved",
  });

  const decks: Array<{
    id: string;
    name: string;
    parentDeckId: string | null;
  }> = [];
  let deepestLeafId = "";
  for (let r = 0; r < ROOT_DECKS; r++) {
    let parentId: string | null = null;
    for (let d = 0; d < DEPTH; d++) {
      const id = `bench-deck-${r}-${d}`;
      decks.push({ id, name: `Deck ${r}.${d}`, parentDeckId: parentId });
      parentId = id;
    }
    if (r === ROOT_DECKS - 1) {
      deepestLeafId = parentId as string;
    }
  }
  await db.insert(deck).values(decks.map((d) => ({ ...d, userId: USER_ID })));

  const cardId = "bench-fc-card";
  await db.insert(flashcard).values({
    id: cardId,
    front: "Front",
    frontNormalized: "front",
    back: "Back",
    deckId: deepestLeafId,
    userId: USER_ID,
  });
  return cardId;
}

async function bench(cardId: string) {
  for (let i = 0; i < 5; i++) {
    await getFlashcardDetailByIdForUser(USER_ID, cardId);
  }

  const samples: number[] = [];
  let path = "";
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    const card = await getFlashcardDetailByIdForUser(USER_ID, cardId);
    samples.push(performance.now() - start);
    if (card) path = card.deckPath ?? "";
  }

  samples.sort((a, b) => a - b);
  const sum = samples.reduce((t, v) => t + v, 0);
  const p = (q: number) => samples[Math.floor(samples.length * q)];
  console.log(`  deckPath = ${path}`);
  console.log(
    `  mean=${(sum / samples.length).toFixed(2)}ms  ` +
      `p50=${p(0.5).toFixed(2)}ms  p95=${p(0.95).toFixed(2)}ms  ` +
      `min=${samples[0].toFixed(2)}ms  max=${samples.at(-1)?.toFixed(2)}ms`,
  );
}

async function main() {
  console.log("Seeding...");
  const cardId = await seed();
  console.log(
    `Benchmarking getFlashcardDetailByIdForUser ` +
      `(${ROOT_DECKS * DEPTH} decks, depth ${DEPTH}, ${ITERATIONS} iters):`,
  );
  await bench(cardId);
  process.exit(0);
}

main();
