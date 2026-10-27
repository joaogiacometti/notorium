ALTER TABLE "flashcard" DROP CONSTRAINT "flashcard_source_mindmap_id_mindmap_id_fk";
--> statement-breakpoint
DROP INDEX "flashcard_sourceMindmapId_idx";--> statement-breakpoint
ALTER TABLE "flashcard" DROP COLUMN "source_mindmap_id";