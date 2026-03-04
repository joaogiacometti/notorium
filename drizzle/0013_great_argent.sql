CREATE TYPE "public"."flashcard_state" AS ENUM('new', 'learning', 'review', 'relearning');--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "state" "flashcard_state" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "due_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "ease" integer DEFAULT 250 NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "interval_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "learning_step" integer;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "last_reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "review_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "lapse_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "flashcard_dueAt_idx" ON "flashcard" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "flashcard_userId_dueAt_idx" ON "flashcard" USING btree ("user_id","due_at");