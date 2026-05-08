import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, count, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import {
  account,
  assessment,
  attendanceMiss,
  deck,
  flashcard,
  flashcardReviewLog,
  flashcardSchedulerSettings,
  instanceState,
  note,
  session,
  subject,
  user,
  verification,
} from "@/db/schema";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  parseFsrsWeights,
  serializeFsrsWeights,
} from "@/features/flashcards/fsrs";
import { normalizeRichTextForUniqueness } from "@/lib/editor/rich-text";
import {
  type E2ECredentials,
  type E2EUserKind,
  getE2ECredentials,
  getE2EWorkerCredentials,
} from "./env";

function createTestAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        account,
        session,
        user,
        verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
  });
}

type TestAuth = ReturnType<typeof createTestAuth>;
let testAuth: TestAuth | null = null;

function getTestAuth(): TestAuth {
  if (testAuth) {
    return testAuth;
  }

  testAuth = createTestAuth();

  return testAuth;
}

type AccessStatus = "approved" | "pending" | "blocked";

export interface E2EUserAccount {
  email: string;
  name: string;
  password: string;
  userId: string;
}

export interface E2EFsrsSettingsSnapshot {
  weights: number[];
  optimizedReviewCount: number;
  lastOptimizedAt: Date | null;
  automaticOptimizationEnabled: boolean;
  reviewCount: number;
}

export interface E2EFsrsReviewSeed {
  deckId: string;
  flashcardIds: string[];
}

function getAccessStatus(kind: E2EUserKind): AccessStatus {
  if (kind === "pending") {
    return "pending";
  }

  if (kind === "blocked") {
    return "blocked";
  }

  return "approved";
}

export async function ensureE2EUserAccount(
  credentials: E2ECredentials,
  accessStatus: AccessStatus,
) {
  let [existingUser] = await getDb()
    .select({
      id: user.id,
    })
    .from(user)
    .where(eq(user.email, credentials.email))
    .limit(1);

  if (!existingUser) {
    const result = await getTestAuth().api.signUpEmail({
      body: {
        email: credentials.email,
        name: credentials.name,
        password: credentials.password,
      },
    });

    existingUser = {
      id: result.user.id,
    };
  }

  await getDb()
    .update(user)
    .set({
      accessStatus,
      name: credentials.name,
    })
    .where(eq(user.id, existingUser.id));

  return {
    ...credentials,
    userId: existingUser.id,
  } satisfies E2EUserAccount;
}

export async function ensureE2EUser(kind: E2EUserKind = "approved") {
  return ensureE2EUserAccount(getE2ECredentials(kind), getAccessStatus(kind));
}

export async function resetE2EInstanceAuthState() {
  await getDb().delete(instanceState);
  await getDb().delete(verification);
  await getDb().delete(user);
}

export async function getUserAccessSnapshotByEmail(email: string) {
  const [result] = await getDb()
    .select({
      id: user.id,
      accessStatus: user.accessStatus,
      isAdmin: user.isAdmin,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return result ?? null;
}

export async function ensureApprovedE2EWorkerUser(workerIndex: number) {
  const credentials = getE2EWorkerCredentials(workerIndex, "approved");

  let [existingUser] = await getDb()
    .select({
      id: user.id,
    })
    .from(user)
    .where(eq(user.email, credentials.email))
    .limit(1);

  if (!existingUser) {
    const result = await getTestAuth().api.signUpEmail({
      body: {
        email: credentials.email,
        name: credentials.name,
        password: credentials.password,
      },
    });

    existingUser = {
      id: result.user.id,
    };
  }

  await getDb()
    .update(user)
    .set({
      accessStatus: "approved",
      name: credentials.name,
    })
    .where(eq(user.id, existingUser.id));

  return {
    ...credentials,
    userId: existingUser.id,
  } satisfies E2EUserAccount;
}

export async function clearUserSubjects(userId: string) {
  await getDb().delete(subject).where(eq(subject.userId, userId));
}

export async function clearUserSubjectsByNames(
  userId: string,
  names: string[],
) {
  if (names.length === 0) {
    return;
  }

  await getDb()
    .delete(subject)
    .where(and(eq(subject.userId, userId), inArray(subject.name, names)));
}

export async function clearUserSessions(userId: string) {
  await getDb().delete(session).where(eq(session.userId, userId));
}

export async function clearUserAttendanceMissesBySubject(
  userId: string,
  subjectId: string,
) {
  await getDb()
    .delete(attendanceMiss)
    .where(
      and(
        eq(attendanceMiss.userId, userId),
        eq(attendanceMiss.subjectId, subjectId),
      ),
    );
}

export async function clearUserNotesBySubject(
  userId: string,
  subjectId: string,
) {
  await getDb()
    .delete(note)
    .where(and(eq(note.userId, userId), eq(note.subjectId, subjectId)));
}

export async function clearUserNotesByTitles(
  userId: string,
  subjectId: string,
  titles: string[],
) {
  if (titles.length === 0) {
    return;
  }

  await getDb()
    .delete(note)
    .where(
      and(
        eq(note.userId, userId),
        eq(note.subjectId, subjectId),
        inArray(note.title, titles),
      ),
    );
}

export async function createNote(
  userId: string,
  subjectId: string,
  title: string,
  content: string,
) {
  const [newNote] = await getDb()
    .insert(note)
    .values({
      userId,
      subjectId,
      title,
      content,
    })
    .returning({ id: note.id });

  return newNote;
}

export async function getNoteById(userId: string, noteId: string) {
  const [existingNote] = await getDb()
    .select({
      content: note.content,
      title: note.title,
    })
    .from(note)
    .where(and(eq(note.userId, userId), eq(note.id, noteId)))
    .limit(1);

  return existingNote ?? null;
}

export async function createAttendanceMiss(
  userId: string,
  subjectId: string,
  missDate: string,
) {
  const [newAttendanceMiss] = await getDb()
    .insert(attendanceMiss)
    .values({
      userId,
      subjectId,
      missDate,
    })
    .returning({ id: attendanceMiss.id });

  return newAttendanceMiss;
}

export async function clearUserAssessmentsBySubject(
  userId: string,
  subjectId: string,
) {
  await getDb()
    .delete(assessment)
    .where(
      and(eq(assessment.userId, userId), eq(assessment.subjectId, subjectId)),
    );
}

export async function clearUserAssessmentsByTitles(
  userId: string,
  subjectId: string,
  titles: string[],
) {
  if (titles.length === 0) {
    return;
  }

  await getDb()
    .delete(assessment)
    .where(
      and(
        eq(assessment.userId, userId),
        eq(assessment.subjectId, subjectId),
        inArray(assessment.title, titles),
      ),
    );
}

export async function createAssessment(
  userId: string,
  subjectId: string,
  title: string,
  options?: {
    description?: string | null;
    type?:
      | "exam"
      | "assignment"
      | "project"
      | "presentation"
      | "homework"
      | "other";
    status?: "pending" | "completed";
    dueDate?: string | null;
    score?: string | null;
    weight?: string | null;
  },
) {
  const [newAssessment] = await getDb()
    .insert(assessment)
    .values({
      userId,
      subjectId,
      title,
      description: options?.description ?? null,
      type: options?.type ?? "other",
      status: options?.status ?? "pending",
      dueDate: options?.dueDate ?? null,
      score: options?.score ?? null,
      weight: options?.weight ?? null,
    })
    .returning({ id: assessment.id });

  return newAssessment;
}

export async function updateSubjectAttendanceSettings(
  userId: string,
  subjectId: string,
  totalClasses: number,
  maxMisses: number,
) {
  await getDb()
    .update(subject)
    .set({
      totalClasses,
      maxMisses,
    })
    .where(and(eq(subject.id, subjectId), eq(subject.userId, userId)));
}

export async function createSubject(
  userId: string,
  name: string,
  options?: {
    archivedAt?: Date | null;
  },
) {
  const [newSubject] = await getDb()
    .insert(subject)
    .values({
      userId,
      name,
      archivedAt: options?.archivedAt ?? null,
    })
    .returning({ id: subject.id });

  return newSubject;
}

export async function clearUserFlashcardsByDeck(
  userId: string,
  deckId: string,
) {
  await getDb()
    .delete(flashcard)
    .where(and(eq(flashcard.userId, userId), eq(flashcard.deckId, deckId)));
}

export async function clearUserFlashcardsByFrontText(
  userId: string,
  deckId: string,
  frontTexts: string[],
) {
  if (frontTexts.length === 0) {
    return;
  }

  await getDb()
    .delete(flashcard)
    .where(
      and(
        eq(flashcard.userId, userId),
        eq(flashcard.deckId, deckId),
        inArray(flashcard.front, frontTexts),
      ),
    );
}

export async function clearUserDecksByNames(userId: string, names: string[]) {
  if (names.length === 0) {
    return;
  }

  await getDb()
    .delete(deck)
    .where(and(eq(deck.userId, userId), inArray(deck.name, names)));
}

export async function createFlashcard(
  userId: string,
  deckIdOrSubjectId: string,
  front: string,
  back: string,
  dueAt: Date = new Date(Date.now() - 60_000),
) {
  const resolvedDeckId = await resolveDeckIdForFlashcard(
    userId,
    deckIdOrSubjectId,
  );

  const [newFlashcard] = await getDb()
    .insert(flashcard)
    .values({
      userId,
      deckId: resolvedDeckId,
      front,
      frontNormalized: normalizeRichTextForUniqueness(front),
      back,
      dueAt,
    })
    .returning({ id: flashcard.id });

  return newFlashcard;
}

export async function createFlashcardForDeck(
  userId: string,
  deckId: string,
  front: string,
  back: string,
  dueAt?: Date,
) {
  return createFlashcardInDeck(userId, deckId, front, back, dueAt);
}

export async function createFlashcardInDeck(
  userId: string,
  deckId: string,
  front: string,
  back: string,
  dueAt?: Date,
): Promise<{ id: string }> {
  const resolvedDueAt =
    dueAt instanceof Date ? dueAt : new Date(Date.now() - 86_400_000);

  const [newFlashcard] = await getDb()
    .insert(flashcard)
    .values({
      userId,
      deckId,
      front,
      frontNormalized: normalizeRichTextForUniqueness(front),
      back,
      dueAt: resolvedDueAt,
    })
    .returning({ id: flashcard.id });

  return newFlashcard;
}

export async function createDeck(
  userId: string,
  name: string,
  description?: string | null,
  parentDeckId?: string | null,
): Promise<{ id: string; name: string }>;
export async function createDeck(
  userId: string,
  subjectId: string,
  name: string,
  description?: string | null,
): Promise<{ id: string; name: string }>;
export async function createDeck(
  userId: string,
  firstArg: string,
  secondArg?: string | null,
  thirdArg?: string | null,
) {
  const usesLegacySubjectSignature =
    secondArg !== undefined && (await subjectExistsForUser(userId, firstArg));
  const name = usesLegacySubjectSignature ? secondArg : firstArg;
  const parentDeckId = usesLegacySubjectSignature ? null : thirdArg;

  if (!name) {
    throw new Error("Deck name is required.");
  }

  const [newDeck] = await getDb()
    .insert(deck)
    .values({
      userId,
      name,
      parentDeckId: parentDeckId ?? null,
    })
    .returning({ id: deck.id, name: deck.name });

  return newDeck;
}

export async function ensureDeckForUser(
  userId: string,
  name: string = "Default",
) {
  const [existingDeck] = await getDb()
    .select({ id: deck.id, name: deck.name })
    .from(deck)
    .where(and(eq(deck.userId, userId), eq(deck.name, name)))
    .limit(1);

  if (existingDeck) return existingDeck;

  const [newDeck] = await getDb()
    .insert(deck)
    .values({
      userId,
      name,
    })
    .returning({ id: deck.id, name: deck.name });

  return newDeck;
}

export async function seedFsrsSchedulerSettings(
  userId: string,
  options?: {
    optimized?: boolean;
    automaticOptimizationEnabled?: boolean;
  },
) {
  const now = new Date("2026-01-15T12:00:00.000Z");
  const defaultWeights = getDefaultFsrsWeights();
  const weights = options?.optimized
    ? defaultWeights.map((value, index) => value + (index === 0 ? 0.01 : 0))
    : defaultWeights;

  await getDb()
    .insert(flashcardSchedulerSettings)
    .values({
      userId,
      desiredRetention: getDefaultFsrsDesiredRetention().toFixed(3),
      weights: serializeFsrsWeights(weights),
      optimizedReviewCount: options?.optimized ? 64 : 0,
      lastOptimizedAt: options?.optimized ? now : null,
      automaticOptimizationEnabled:
        options?.automaticOptimizationEnabled ?? false,
      legacySchedulerMigratedAt: now,
    })
    .onConflictDoUpdate({
      target: flashcardSchedulerSettings.userId,
      set: {
        weights: serializeFsrsWeights(weights),
        optimizedReviewCount: options?.optimized ? 64 : 0,
        lastOptimizedAt: options?.optimized ? now : null,
        automaticOptimizationEnabled:
          options?.automaticOptimizationEnabled ?? false,
      },
    });
}

export async function readFsrsSchedulerSettings(
  userId: string,
): Promise<E2EFsrsSettingsSnapshot> {
  const [settings] = await getDb()
    .select()
    .from(flashcardSchedulerSettings)
    .where(eq(flashcardSchedulerSettings.userId, userId))
    .limit(1);
  const reviewCount = await getE2EFsrsReviewLogCount(userId);

  if (!settings) {
    throw new Error(`Expected FSRS settings for user ${userId}`);
  }

  return {
    weights: parseFsrsWeights(settings.weights),
    optimizedReviewCount: settings.optimizedReviewCount,
    lastOptimizedAt: settings.lastOptimizedAt,
    automaticOptimizationEnabled: settings.automaticOptimizationEnabled,
    reviewCount,
  };
}

export async function createFsrsOptimizationReviewHistory(
  userId: string,
  name: string,
  reviewCount: number,
): Promise<E2EFsrsReviewSeed> {
  const createdDeck = await createDeck(userId, name);
  const flashcardCount = Math.max(1, Math.ceil(reviewCount / 4));
  const createdFlashcards: { id: string }[] = [];

  for (let index = 0; index < flashcardCount; index++) {
    createdFlashcards.push(
      await createFlashcardInDeck(
        userId,
        createdDeck.id,
        `${name} front ${index}`,
        `${name} back ${index}`,
      ),
    );
  }

  await seedFsrsReviewLogs(
    userId,
    createdFlashcards.map((createdFlashcard) => createdFlashcard.id),
    name,
    reviewCount,
  );

  return {
    deckId: createdDeck.id,
    flashcardIds: createdFlashcards.map(
      (createdFlashcard) => createdFlashcard.id,
    ),
  };
}

export async function resetFsrsSchedulerSettings(userId: string) {
  await seedFsrsSchedulerSettings(userId, {
    optimized: false,
    automaticOptimizationEnabled: false,
  });
}

async function getE2EFsrsReviewLogCount(userId: string) {
  const rows = await getDb()
    .select({ total: count() })
    .from(flashcardReviewLog)
    .where(eq(flashcardReviewLog.userId, userId));

  return rows[0]?.total ?? 0;
}

function getSeedRatingForCardReview(
  cardIndex: number,
  cardPosition: number,
): "again" | "hard" | "easy" | "good" {
  const patterns: Array<
    [
      "again" | "hard" | "easy" | "good",
      "again" | "hard" | "easy" | "good",
      "again" | "hard" | "easy" | "good",
      "again" | "hard" | "easy" | "good",
    ]
  > = [
    ["again", "hard", "good", "easy"],
    ["good", "again", "hard", "easy"],
    ["hard", "good", "easy", "again"],
    ["easy", "hard", "good", "again"],
  ];

  const pattern = patterns[cardIndex % patterns.length];
  return pattern[cardPosition % pattern.length];
}

async function seedFsrsReviewLogs(
  userId: string,
  flashcardIds: string[],
  seedName: string,
  reviewCount: number,
) {
  if (reviewCount === 0) {
    return;
  }

  const baseTime = new Date("2026-01-01T00:00:00.000Z").getTime();
  const logs = Array.from({ length: reviewCount }, (_, index) => {
    const reviewDay = Math.floor(index / flashcardIds.length);
    const daysElapsed = reviewDay === 0 ? 0 : 2 ** (reviewDay - 1);
    const offsetMs =
      reviewDay * 24 * 60 * 60 * 1000 + (index % flashcardIds.length) * 1000;
    const cardIndex = index % flashcardIds.length;
    const cardPosition = reviewDay;
    const rating = getSeedRatingForCardReview(cardIndex, cardPosition);
    return {
      flashcardId: getFsrsSeedFlashcardId(flashcardIds, index),
      userId,
      clientReviewId: `${seedName}-${index}`,
      rating,
      reviewedAt: new Date(baseTime + offsetMs),
      daysElapsed,
    };
  });

  await getDb().insert(flashcardReviewLog).values(logs);
}

function getFsrsSeedFlashcardId(flashcardIds: string[], index: number): string {
  const flashcardId = flashcardIds[index % flashcardIds.length];
  if (!flashcardId) {
    throw new Error(
      `Expected at least one flashcard id for FSRS seed index ${index}`,
    );
  }

  return flashcardId;
}

async function resolveDeckIdForFlashcard(
  userId: string,
  deckIdOrSubjectId: string,
) {
  const [existingDeck] = await getDb()
    .select({ id: deck.id })
    .from(deck)
    .where(and(eq(deck.id, deckIdOrSubjectId), eq(deck.userId, userId)))
    .limit(1);

  if (existingDeck) {
    return existingDeck.id;
  }

  const ensuredDeck = await ensureDeckForUser(userId);
  return ensuredDeck.id;
}

async function subjectExistsForUser(userId: string, subjectId: string) {
  const [existingSubject] = await getDb()
    .select({ id: subject.id })
    .from(subject)
    .where(and(eq(subject.id, subjectId), eq(subject.userId, userId)))
    .limit(1);

  return Boolean(existingSubject);
}
