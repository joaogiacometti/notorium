ALTER TABLE "flashcard" ADD COLUMN "front_document" jsonb;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "back_document" jsonb;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "front_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "back_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "note" ADD COLUMN "content_document" jsonb;--> statement-breakpoint
ALTER TABLE "note" ADD COLUMN "content_text" text DEFAULT '' NOT NULL;