DROP INDEX "flashcard_userId_dueAt_idx";--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
CREATE INDEX "flashcard_userId_dueAt_idx" ON "flashcard" USING btree ("user_id","due_at") WHERE "flashcard"."archived_at" is null;