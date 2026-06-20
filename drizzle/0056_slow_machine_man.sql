ALTER TABLE "flashcard" ALTER COLUMN "deck_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flashcard_subjectId_idx" ON "flashcard" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "flashcard_userId_subjectId_updatedAt_idx" ON "flashcard" USING btree ("user_id","subject_id","updated_at");