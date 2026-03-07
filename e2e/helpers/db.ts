import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run E2E tests.");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

async function getE2EUserId(email: string) {
  const result = await pool.query<{ id: string }>(
    'select id from "user" where email = $1 limit 1',
    [email],
  );

  return result.rows[0]?.id ?? null;
}

export async function resetE2EUser(email: string) {
  await pool.query('delete from "user" where email = $1', [email]);
}

export async function approveE2EUser(email: string) {
  await pool.query('update "user" set access_status = $1 where email = $2', [
    "approved",
    email,
  ]);
}

export async function setE2EUserAccessStatus(
  email: string,
  status: "pending" | "approved" | "blocked",
) {
  await pool.query('update "user" set access_status = $1 where email = $2', [
    status,
    email,
  ]);
}

export async function clearE2ESubjects(email: string) {
  const userId = await getE2EUserId(email);
  if (!userId) {
    return;
  }

  await pool.query("delete from subject where user_id = $1", [userId]);
}

export async function seedFlashcardReviewSubject(
  email: string,
  data: {
    name: string;
    description: string;
    flashcards: Array<{
      front: string;
      back: string;
      dueAt: Date;
      state?: "new" | "learning" | "review" | "relearning";
      ease?: number;
      intervalDays?: number;
      learningStep?: number | null;
      reviewCount?: number;
      lapseCount?: number;
    }>;
  },
) {
  const userId = await getE2EUserId(email);

  if (!userId) {
    throw new Error(`E2E user not found for ${email}.`);
  }

  const subjectId = randomUUID();

  await pool.query(
    "insert into subject (id, name, description, user_id) values ($1, $2, $3, $4)",
    [subjectId, data.name, data.description, userId],
  );

  for (const flashcardData of data.flashcards) {
    await pool.query(
      `insert into flashcard (
        id,
        front,
        back,
        state,
        due_at,
        ease,
        interval_days,
        learning_step,
        review_count,
        lapse_count,
        subject_id,
        user_id
      ) values (
        $1,
        $2,
        $3,
        $4::flashcard_state,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12
      )`,
      [
        randomUUID(),
        flashcardData.front,
        flashcardData.back,
        flashcardData.state ?? "new",
        flashcardData.dueAt,
        flashcardData.ease ?? 250,
        flashcardData.intervalDays ?? 0,
        flashcardData.learningStep ?? null,
        flashcardData.reviewCount ?? 0,
        flashcardData.lapseCount ?? 0,
        subjectId,
        userId,
      ],
    );
  }

  return { subjectId };
}

export async function closeE2EDb() {
  await pool.end();
}
