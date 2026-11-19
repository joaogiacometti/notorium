ALTER TABLE "flashcard" ALTER COLUMN "interval_days" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "stability_fast" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "flashcard_review_log" DROP COLUMN "days_elapsed";