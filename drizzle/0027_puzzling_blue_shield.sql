CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "flashcard_front_trgm_idx" ON "flashcard" USING gin ("front" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "flashcard_back_trgm_idx" ON "flashcard" USING gin ("back" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "note_title_trgm_idx" ON "note" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "note_content_trgm_idx" ON "note" USING gin (coalesce("content", '') gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "subject_name_trgm_idx" ON "subject" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "subject_description_trgm_idx" ON "subject" USING gin (coalesce("description", '') gin_trgm_ops);
