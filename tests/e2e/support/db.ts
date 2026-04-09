import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import {
  account,
  assessment,
  attendanceMiss,
  deck,
  flashcard,
  instanceState,
  note,
  session,
  subject,
  user,
  verification,
} from "@/db/schema";
import { LIMITS } from "@/lib/config/limits";
import { normalizeRichTextForUniqueness } from "@/lib/editor/rich-text";
import {
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

function getAccessStatus(kind: E2EUserKind): AccessStatus {
  if (kind === "pending") {
    return "pending";
  }

  if (kind === "blocked") {
    return "blocked";
  }

  return "approved";
}

export async function ensureE2EUser(kind: E2EUserKind = "approved") {
  const credentials = getE2ECredentials(kind);
  const accessStatus = getAccessStatus(kind);

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
  description: string,
) {
  const [newSubject] = await getDb()
    .insert(subject)
    .values({
      userId,
      name,
      description,
    })
    .returning({ id: subject.id });

  return newSubject;
}

export async function clearUserFlashcardsBySubject(
  userId: string,
  subjectId: string,
) {
  await getDb()
    .delete(flashcard)
    .where(
      and(eq(flashcard.userId, userId), eq(flashcard.subjectId, subjectId)),
    );
}

export async function clearUserFlashcardsByFrontText(
  userId: string,
  subjectId: string,
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
        eq(flashcard.subjectId, subjectId),
        inArray(flashcard.front, frontTexts),
      ),
    );
}

export async function createFlashcard(
  userId: string,
  subjectId: string,
  front: string,
  back: string,
) {
  const [newFlashcard] = await getDb()
    .insert(flashcard)
    .values({
      userId,
      subjectId,
      front,
      frontNormalized: normalizeRichTextForUniqueness(front),
      back,
    })
    .returning({ id: flashcard.id });

  return newFlashcard;
}

async function createMany(
  count: number,
  create: (index: number) => Promise<unknown>,
) {
  for (let index = 0; index < count; index += 1) {
    await create(index);
  }
}

export async function createMaxFlashcardsForSubject(
  userId: string,
  subjectId: string,
) {
  await createMany(LIMITS.maxFlashcardsPerSubject, async (index) => {
    await createFlashcard(
      userId,
      subjectId,
      `e2e-limit-flashcard-front-${index}`,
      `e2e-limit-flashcard-back-${index}`,
    );
  });
}

export async function createMaxNotesForSubject(
  userId: string,
  subjectId: string,
) {
  await createMany(LIMITS.maxNotesPerSubject, async (index) => {
    await createNote(
      userId,
      subjectId,
      `e2e-limit-note-${index}`,
      `e2e-limit-note-content-${index}`,
    );
  });
}

export async function createMaxAssessmentsForSubject(
  userId: string,
  subjectId: string,
) {
  await createMany(LIMITS.maxAssessmentsPerSubject, async (index) => {
    await createAssessment(userId, subjectId, `e2e-limit-assessment-${index}`);
  });
}

export async function createDeck(
  userId: string,
  subjectId: string,
  name: string,
  description?: string | null,
) {
  const [newDeck] = await getDb()
    .insert(deck)
    .values({
      userId,
      subjectId,
      name,
      description: description ?? null,
      isDefault: false,
    })
    .returning({ id: deck.id, name: deck.name });

  return newDeck;
}

export async function createMaxDecksForSubject(
  userId: string,
  subjectId: string,
) {
  await createMany(LIMITS.maxDecksPerSubject, async (index) => {
    await createDeck(userId, subjectId, `e2e-limit-deck-${index}`, null);
  });
}

export async function getDefaultDeckForSubject(
  userId: string,
  subjectId: string,
) {
  const [defaultDeck] = await getDb()
    .select({ id: deck.id, name: deck.name })
    .from(deck)
    .where(
      and(
        eq(deck.userId, userId),
        eq(deck.subjectId, subjectId),
        eq(deck.isDefault, true),
      ),
    )
    .limit(1);

  return defaultDeck ?? null;
}

export async function ensureDefaultDeckForSubject(
  userId: string,
  subjectId: string,
) {
  const existing = await getDefaultDeckForSubject(userId, subjectId);
  if (existing) return existing;

  const [newDeck] = await getDb()
    .insert(deck)
    .values({
      userId,
      subjectId,
      name: "General",
      isDefault: true,
    })
    .returning({ id: deck.id, name: deck.name });

  return newDeck;
}
