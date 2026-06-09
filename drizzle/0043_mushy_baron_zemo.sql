ALTER TABLE "mindmap" ADD COLUMN "subject_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mindmap" ADD CONSTRAINT "mindmap_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mindmap_subjectId_idx" ON "mindmap" USING btree ("subject_id");