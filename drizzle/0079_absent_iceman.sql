DROP INDEX "flashcard_front_unaccent_trgm_idx";--> statement-breakpoint
DROP INDEX "flashcard_back_unaccent_trgm_idx";--> statement-breakpoint
DROP INDEX "note_content_unaccent_trgm_idx";--> statement-breakpoint
ALTER TABLE "flashcard" ALTER COLUMN "front_document" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard" ALTER COLUMN "back_document" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "note" ALTER COLUMN "content_document" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "flashcard_front_unaccent_trgm_idx" ON "flashcard" USING gin (immutable_unaccent("front_text") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "flashcard_back_unaccent_trgm_idx" ON "flashcard" USING gin (immutable_unaccent("back_text") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "note_content_unaccent_trgm_idx" ON "note" USING gin (immutable_unaccent("content_text") gin_trgm_ops);--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "front";--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "back";--> statement-breakpoint
ALTER TABLE "note" DROP COLUMN "content";