ALTER TYPE "public"."flashcard_type" ADD VALUE 'occlusion';--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "occlusion_note_id" text;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "occlusion_image_pathname" text;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "occlusion_regions" jsonb;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "occlusion_mask_id" text;--> statement-breakpoint
CREATE INDEX "flashcard_occlusionNoteId_idx" ON "flashcard" USING btree ("occlusion_note_id");