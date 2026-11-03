// One-off maintenance command: npm run db:migrate:rich-text
// Reads DATABASE_URL (or .env via the npm command). Add -- --dry-run to verify
// and roll back. Run before deploying the JSON application; keep the backup
// until the new application has been verified. Normal db:migrate is unchanged.
import { readMigrationFiles } from "drizzle-orm/migrator";
import { JSDOM } from "jsdom";
import { Pool, type PoolClient } from "pg";
import { documentText, emptyDocument } from "../src/lib/editor/document";
import { documentUniquenessText } from "../src/lib/editor/document-content";
import { importLegacyDocument } from "../src/lib/editor/legacy-document-import";

/** Runs only between the generated add-column and drop-column migrations. */
async function migrateRichText(client: PoolClient): Promise<void> {
  const columns = await client.query<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'flashcard'",
  );
  const names = new Set(columns.rows.map((row) => row.column_name));
  if (!names.has("front_document") || !names.has("front")) return;
  await client.query('LOCK TABLE "note", "flashcard" IN ACCESS EXCLUSIVE MODE');
  let notes = 0;
  let cards = 0;
  let cursor = "";
  while (true) {
    const batch = await client.query<{ id: string; content: string | null }>(
      "SELECT id, content FROM note WHERE id > $1 ORDER BY id LIMIT 200",
      [cursor],
    );
    if (!batch.rowCount) break;
    for (const row of batch.rows) {
      try {
        const content =
          row.content === null
            ? emptyDocument()
            : importLegacyDocument(row.content);
        await client.query(
          "UPDATE note SET content_document = $1::jsonb, content_text = $2 WHERE id = $3",
          [JSON.stringify(content), documentText(content), row.id],
        );
      } catch {
        throw new Error(
          `Rich-text migration refused note ${row.id}; inspect its legacy content before retrying`,
        );
      }
      cursor = row.id;
      notes++;
    }
  }
  cursor = "";
  // Recompute uniqueness in two steps so swaps never conflict mid-conversion.
  // The unique index is restored by PostgreSQL when the transaction commits.
  await client.query(
    'ALTER TABLE flashcard DROP CONSTRAINT "flashcard_userId_frontNormalized_unique"',
  );
  while (true) {
    const batch = await client.query<{
      id: string;
      front: string;
      back: string;
    }>(
      "SELECT id, front, back FROM flashcard WHERE id > $1 ORDER BY id LIMIT 200",
      [cursor],
    );
    if (!batch.rowCount) break;
    for (const row of batch.rows) {
      try {
        const front = importLegacyDocument(row.front);
        const back = importLegacyDocument(row.back);
        await client.query(
          "UPDATE flashcard SET front_document = $1::jsonb, back_document = $2::jsonb, front_text = $3, back_text = $4, front_normalized = $5 WHERE id = $6",
          [
            JSON.stringify(front),
            JSON.stringify(back),
            documentText(front),
            documentText(back),
            documentUniquenessText(front),
            row.id,
          ],
        );
      } catch {
        throw new Error(
          `Rich-text migration refused flashcard ${row.id}; inspect its legacy content before retrying`,
        );
      }
      cursor = row.id;
      cards++;
    }
  }
  await client.query(
    'ALTER TABLE flashcard ADD CONSTRAINT "flashcard_userId_frontNormalized_unique" UNIQUE (user_id, front_normalized)',
  );
  const missing = await client.query(
    "SELECT id FROM flashcard WHERE front_document IS NULL OR back_document IS NULL UNION ALL SELECT id FROM note WHERE content_document IS NULL LIMIT 1",
  );
  if (missing.rowCount) throw new Error("Rich-text backfill is incomplete");
  console.info(
    `Converted ${notes} notes and ${cards} flashcards to document JSON`,
  );
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  // Only the offline legacy HTML importer needs a DOM. Application document
  // validation, indexing, and rendering run directly against JSON.
  const dom = new JSDOM("<!doctype html>");
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Node: dom.window.Node,
    Element: dom.window.Element,
  });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(717432068)");
    await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
    await client.query(
      "CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)",
    );
    const applied = await client.query<{ hash: string; created_at: string }>(
      "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
    );
    const latest = Number(applied.rows.at(-1)?.created_at ?? -1);
    const migrations = readMigrationFiles({ migrationsFolder: "drizzle" });
    for (const migration of migrations) {
      if (migration.folderMillis <= latest) continue;
      await migrateRichText(client);
      for (const statement of migration.sql) await client.query(statement);
      await client.query(
        "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
        [migration.hash, migration.folderMillis],
      );
    }
    await client.query(
      process.argv.includes("--dry-run") ? "ROLLBACK" : "COMMIT",
    );
    console.info(
      process.argv.includes("--dry-run")
        ? "Dry run verified; no database changes committed"
        : "Database migrations completed",
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
    dom.window.close();
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Database migration failed",
  );
  process.exitCode = 1;
});
