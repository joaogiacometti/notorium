ALTER TABLE "subject" ADD COLUMN "notes_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subject" ADD COLUMN "grades_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subject" ADD COLUMN "attendance_enabled" boolean DEFAULT true NOT NULL;