ALTER TABLE "flashcard" ADD COLUMN "source_note_id" text;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "source_mindmap_id" text;--> statement-breakpoint
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_source_note_id_note_id_fk" FOREIGN KEY ("source_note_id") REFERENCES "public"."note"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_source_mindmap_id_mindmap_id_fk" FOREIGN KEY ("source_mindmap_id") REFERENCES "public"."mindmap"("id") ON DELETE set null ON UPDATE no action;