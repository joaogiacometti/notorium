ALTER TABLE "flashcard_review_log" ADD COLUMN "review_count_after" integer;--> statement-breakpoint
ALTER TABLE "flashcard_review_log" ADD COLUMN "previous_scheduling_state" jsonb;--> statement-breakpoint
CREATE INDEX "flashcard_review_log_userId_flashcardId_reviewedAt_idx" ON "flashcard_review_log" USING btree ("user_id","flashcard_id","reviewed_at");