ALTER TABLE "deck" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "deck" CASCADE;--> statement-breakpoint
ALTER TABLE "flashcard" DROP CONSTRAINT IF EXISTS "flashcard_deck_id_deck_id_fk";
--> statement-breakpoint
DROP INDEX "flashcard_deckId_idx";--> statement-breakpoint
DROP INDEX "flashcard_userId_deckId_updatedAt_idx";--> statement-breakpoint
ALTER TABLE "flashcard" ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "deck_id";