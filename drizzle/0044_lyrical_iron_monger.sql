CREATE TYPE "public"."flashcard_type" AS ENUM('basic', 'cloze');--> statement-breakpoint
CREATE TABLE "flashcard_merge_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"merged_flashcard_id" text,
	"source_flashcard_id" text,
	"source_front" text NOT NULL,
	"source_back" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "type" "flashcard_type" DEFAULT 'basic' NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "cloze_note_id" text;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "cloze_ordinal" integer;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "cloze_source" text;--> statement-breakpoint
ALTER TABLE "flashcard_merge_log" ADD CONSTRAINT "flashcard_merge_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_merge_log" ADD CONSTRAINT "flashcard_merge_log_merged_flashcard_id_flashcard_id_fk" FOREIGN KEY ("merged_flashcard_id") REFERENCES "public"."flashcard"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flashcard_merge_log_userId_idx" ON "flashcard_merge_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "flashcard_merge_log_mergedFlashcardId_idx" ON "flashcard_merge_log" USING btree ("merged_flashcard_id");--> statement-breakpoint
CREATE INDEX "flashcard_clozeNoteId_idx" ON "flashcard" USING btree ("cloze_note_id");