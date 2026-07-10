ALTER TABLE "flashcard_review_log" DROP CONSTRAINT "flashcard_review_log_flashcard_id_flashcard_id_fk";
--> statement-breakpoint
ALTER TABLE "flashcard_review_log" ADD COLUMN "subject_id" text;--> statement-breakpoint
CREATE INDEX "flashcard_review_log_subjectId_idx" ON "flashcard_review_log" USING btree ("subject_id");