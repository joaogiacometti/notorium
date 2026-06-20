/**
 * One-shot data migration: repoint flashcards from decks onto subjects.
 *
 * Flashcards are moving from a dedicated `deck` tree to the shared `subject`
 * tree (see schema Migration A/B). For every user this creates one `general`
 * subject per deck, preserving the deck hierarchy as a subject subtree, then
 * sets `flashcard.subjectId` from the deck->subject map.
 *
 * Run AFTER Migration A (adds nullable flashcard.subjectId) and BEFORE
 * Migration B (makes it notNull, drops deckId + the deck table):
 *
 *   bun --env-file=.env run scripts/backfill-decks-to-subjects.ts
 *
 * Safe to re-run: the whole job runs in one transaction and exits early when
 * no flashcard still needs a subject, so a clean DB is a no-op.
 *
 * Name collisions: the `(userId, parent, name)` unique index is shared across
 * subject kinds, so a generated `general` "Biology" can collide with an
 * existing academic "Biology" at the same level. Colliding names get a
 * " (cards)" suffix (then " (cards 2)", ...) and every rename is logged.
 */
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/index";
import { deck, flashcard, subject } from "@/db/schema";

interface DeckRow {
  id: string;
  name: string;
  parentDeckId: string | null;
  userId: string;
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Orders decks so every deck appears after its parent. The deck tree is a
 * forest, so a parent always exists in the same user's set or is null.
 */
function topoSortDecks(decks: DeckRow[]): DeckRow[] {
  const byId = new Map(decks.map((d) => [d.id, d]));
  const sorted: DeckRow[] = [];
  const seen = new Set<string>();
  const visit = (node: DeckRow) => {
    if (seen.has(node.id)) return;
    const parent = node.parentDeckId ? byId.get(node.parentDeckId) : undefined;
    if (parent) visit(parent);
    seen.add(node.id);
    sorted.push(node);
  };
  for (const node of decks) visit(node);
  return sorted;
}

/**
 * Returns a collision-free name for a subject under `parentKey`, suffixing
 * " (cards)" when `taken` already holds the desired name. Mutates `taken`.
 */
function resolveName(
  desired: string,
  parentKey: string,
  taken: Map<string, Set<string>>,
): string {
  const names = taken.get(parentKey) ?? new Set<string>();
  taken.set(parentKey, names);
  if (!names.has(desired)) {
    names.add(desired);
    return desired;
  }
  for (let i = 1; ; i += 1) {
    const candidate =
      i === 1 ? `${desired} (cards)` : `${desired} (cards ${i})`;
    if (!names.has(candidate)) {
      names.add(candidate);
      return candidate;
    }
  }
}

async function loadTakenNames(
  tx: Tx,
  userId: string,
): Promise<Map<string, Set<string>>> {
  const existing = await tx
    .select({ name: subject.name, parentSubjectId: subject.parentSubjectId })
    .from(subject)
    .where(eq(subject.userId, userId));
  const taken = new Map<string, Set<string>>();
  for (const row of existing) {
    const key = row.parentSubjectId ?? "__root__";
    const names = taken.get(key) ?? new Set<string>();
    names.add(row.name);
    taken.set(key, names);
  }
  return taken;
}

async function backfillUser(tx: Tx, userId: string): Promise<number> {
  const decks = (await tx
    .select({
      id: deck.id,
      name: deck.name,
      parentDeckId: deck.parentDeckId,
      userId: deck.userId,
    })
    .from(deck)
    .where(eq(deck.userId, userId))) as DeckRow[];
  if (decks.length === 0) return 0;

  const taken = await loadTakenNames(tx, userId);
  const deckToSubject = new Map<string, string>();

  for (const node of topoSortDecks(decks)) {
    const parentSubjectId = node.parentDeckId
      ? (deckToSubject.get(node.parentDeckId) ?? null)
      : null;
    const parentKey = parentSubjectId ?? "__root__";
    const name = resolveName(node.name, parentKey, taken);
    if (name !== node.name) {
      console.info(
        JSON.stringify({
          event: "deck_subject_rename",
          userId,
          deckId: node.id,
          from: node.name,
          to: name,
        }),
      );
    }
    const [created] = await tx
      .insert(subject)
      .values({ name, kind: "general", parentSubjectId, userId })
      .returning({ id: subject.id });
    deckToSubject.set(node.id, created.id);
  }

  let repointed = 0;
  for (const [deckId, subjectId] of deckToSubject) {
    const updated = await tx
      .update(flashcard)
      .set({ subjectId })
      .where(and(eq(flashcard.deckId, deckId), isNull(flashcard.subjectId)))
      .returning({ id: flashcard.id });
    repointed += updated.length;
  }
  return repointed;
}

async function main(): Promise<void> {
  const db = getDb();
  const pending = await db
    .select({ id: flashcard.id })
    .from(flashcard)
    .where(isNull(flashcard.subjectId))
    .limit(1);
  if (pending.length === 0) {
    console.info(
      JSON.stringify({ event: "backfill_skip", reason: "no_pending" }),
    );
    return;
  }

  await db.transaction(async (tx) => {
    const userRows = await tx
      .selectDistinct({ userId: flashcard.userId })
      .from(flashcard)
      .where(isNull(flashcard.subjectId));
    let total = 0;
    for (const { userId } of userRows) {
      total += await backfillUser(tx, userId);
    }
    console.info(
      JSON.stringify({
        event: "backfill_done",
        users: userRows.length,
        repointed: total,
      }),
    );
  });
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(
      JSON.stringify({ event: "backfill_failed", error: String(error) }),
    );
    process.exit(1);
  },
);
