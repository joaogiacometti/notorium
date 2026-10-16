DROP INDEX "flashcard_clozeNoteId_idx";--> statement-breakpoint
DROP INDEX "flashcard_occlusionNoteId_idx";--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "cloze_note_id";--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "cloze_ordinal";--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "cloze_source";--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "occlusion_note_id";--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "occlusion_image_pathname";--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "occlusion_regions";--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "occlusion_mask_id";--> statement-breakpoint
DROP TYPE "public"."flashcard_type";