UPDATE "flashcard" AS "flashcard"
SET "deck_id" = "default_deck"."id"
FROM "deck" AS "default_deck"
WHERE "flashcard"."subject_id" = "default_deck"."subject_id"
  AND "flashcard"."user_id" = "default_deck"."user_id"
  AND "default_deck"."is_default" = true;--> statement-breakpoint
DELETE FROM "deck"
WHERE "is_default" = false;--> statement-breakpoint
WITH RECURSIVE "ordered_default_decks" AS (
  SELECT
    "deck"."id",
    "deck"."user_id",
    "subject"."name" AS "base_name",
    ROW_NUMBER() OVER (
      PARTITION BY "deck"."user_id"
      ORDER BY "subject"."created_at", "subject"."id"
    ) AS "seq"
  FROM "deck"
  INNER JOIN "subject" ON "subject"."id" = "deck"."subject_id"
  WHERE "deck"."is_default" = true
),
"assigned_names" AS (
  SELECT
    "ordered_default_decks"."id",
    "ordered_default_decks"."user_id",
    "ordered_default_decks"."seq",
    "ordered_default_decks"."base_name",
    "ordered_default_decks"."base_name" AS "final_name",
    ARRAY["ordered_default_decks"."base_name"]::text[] AS "used_names"
  FROM "ordered_default_decks"
  WHERE "ordered_default_decks"."seq" = 1
  UNION ALL
  SELECT
    "next_deck"."id",
    "next_deck"."user_id",
    "next_deck"."seq",
    "next_deck"."base_name",
    "candidate_name"."final_name",
    "assigned_names"."used_names" || "candidate_name"."final_name"
  FROM "assigned_names"
  INNER JOIN "ordered_default_decks" AS "next_deck"
    ON "next_deck"."user_id" = "assigned_names"."user_id"
   AND "next_deck"."seq" = "assigned_names"."seq" + 1
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN NOT ("next_deck"."base_name" = ANY("assigned_names"."used_names"))
        THEN "next_deck"."base_name"
      ELSE (
        SELECT "next_deck"."base_name" || ' (' || "suffix"."n" || ')'
        FROM GENERATE_SERIES(2, 200) AS "suffix"("n")
        WHERE NOT (("next_deck"."base_name" || ' (' || "suffix"."n" || ')') = ANY("assigned_names"."used_names"))
        ORDER BY "suffix"."n"
        LIMIT 1
      )
    END AS "final_name"
  ) AS "candidate_name"
)
UPDATE "deck"
SET
  "name" = "assigned_names"."final_name",
  "updated_at" = NOW()
FROM "assigned_names"
WHERE "deck"."id" = "assigned_names"."id";--> statement-breakpoint
ALTER TABLE "deck" DROP CONSTRAINT "deck_userId_subjectId_name_unique";--> statement-breakpoint
ALTER TABLE "deck" DROP CONSTRAINT "deck_subject_id_subject_id_fk";
--> statement-breakpoint
ALTER TABLE "flashcard" DROP CONSTRAINT "flashcard_subject_id_subject_id_fk";
--> statement-breakpoint
ALTER TABLE "flashcard" DROP CONSTRAINT "flashcard_deck_id_deck_id_fk";
--> statement-breakpoint
DROP INDEX "deck_subjectId_idx";--> statement-breakpoint
DROP INDEX "deck_userId_subjectId_idx";--> statement-breakpoint
DROP INDEX "flashcard_subjectId_idx";--> statement-breakpoint
DROP INDEX "flashcard_userId_subjectId_updatedAt_idx";--> statement-breakpoint
ALTER TABLE "flashcard" ALTER COLUMN "deck_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "deck" ADD COLUMN "parent_deck_id" text;--> statement-breakpoint
ALTER TABLE "deck" ADD CONSTRAINT "deck_parent_deck_id_deck_id_fk" FOREIGN KEY ("parent_deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_parentDeckId_idx" ON "deck" USING btree ("parent_deck_id");--> statement-breakpoint
CREATE INDEX "deck_userId_parentDeckId_idx" ON "deck" USING btree ("user_id","parent_deck_id");--> statement-breakpoint
ALTER TABLE "deck" DROP COLUMN "is_default";--> statement-breakpoint
ALTER TABLE "deck" DROP COLUMN "subject_id";--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "subject_id";--> statement-breakpoint
ALTER TABLE "deck" ADD CONSTRAINT "deck_userId_parentDeckId_name_unique" UNIQUE("user_id","parent_deck_id","name");
