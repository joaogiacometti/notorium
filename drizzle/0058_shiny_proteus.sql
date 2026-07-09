ALTER TABLE "library_annotation" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "library_book" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "library_annotation" CASCADE;--> statement-breakpoint
DROP TABLE "library_book" CASCADE;--> statement-breakpoint
DROP INDEX "flashcard_scheduler_settings_userId_idx";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "reader_color_inverted";