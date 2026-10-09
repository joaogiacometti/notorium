ALTER TYPE "public"."assessment_type" ADD VALUE 'study' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "study_week" integer;--> statement-breakpoint
ALTER TABLE "subject" ADD COLUMN "study_weekday" integer;--> statement-breakpoint
ALTER TABLE "subject" ADD COLUMN "study_term_start" date;--> statement-breakpoint
ALTER TABLE "subject" ADD COLUMN "study_term_end" date;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_subjectId_studyWeek_unique" ON "assessment" USING btree ("subject_id","study_week");