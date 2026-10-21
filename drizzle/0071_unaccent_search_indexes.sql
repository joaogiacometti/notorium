DROP INDEX "flashcard_front_trgm_idx";--> statement-breakpoint
DROP INDEX "flashcard_back_trgm_idx";--> statement-breakpoint
DROP INDEX "mindmap_title_trgm_idx";--> statement-breakpoint
DROP INDEX "note_title_trgm_idx";--> statement-breakpoint
DROP INDEX "note_content_trgm_idx";--> statement-breakpoint
DROP INDEX "subject_name_trgm_idx";--> statement-breakpoint
CREATE INDEX "flashcard_front_unaccent_trgm_idx" ON "flashcard" USING gin (immutable_unaccent("front") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "flashcard_back_unaccent_trgm_idx" ON "flashcard" USING gin (immutable_unaccent("back") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "mindmap_title_unaccent_trgm_idx" ON "mindmap" USING gin (immutable_unaccent("title") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "note_title_unaccent_trgm_idx" ON "note" USING gin (immutable_unaccent("title") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "note_content_unaccent_trgm_idx" ON "note" USING gin (immutable_unaccent("content") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "subject_name_unaccent_trgm_idx" ON "subject" USING gin (immutable_unaccent("name") gin_trgm_ops);