ALTER TABLE "subject" ADD COLUMN "parent_subject_id" text;--> statement-breakpoint
ALTER TABLE "subject" ADD CONSTRAINT "subject_parent_subject_id_subject_id_fk" FOREIGN KEY ("parent_subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subject_userId_parentSubjectId_name_unique" ON "subject" USING btree ("user_id",coalesce("parent_subject_id", '__root_subject__'),"name");--> statement-breakpoint
CREATE INDEX "subject_parentSubjectId_idx" ON "subject" USING btree ("parent_subject_id");