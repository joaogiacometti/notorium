ALTER TABLE "library_book" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "library_book" ADD CONSTRAINT "library_book_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "library_book_userId_subjectId_idx" ON "library_book" USING btree ("user_id","subject_id");