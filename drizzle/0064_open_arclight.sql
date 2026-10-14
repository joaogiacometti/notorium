DROP INDEX "assessment_subjectId_studyWeek_unique";--> statement-breakpoint
ALTER TABLE "assessment" DROP COLUMN "study_week";--> statement-breakpoint
ALTER TABLE "subject" DROP COLUMN "study_weekday";--> statement-breakpoint
ALTER TABLE "subject" DROP COLUMN "study_term_start";--> statement-breakpoint
ALTER TABLE "subject" DROP COLUMN "study_term_end";