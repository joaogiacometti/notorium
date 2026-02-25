DROP TABLE "grade";--> statement-breakpoint
DROP TABLE "grade_category";--> statement-breakpoint
CREATE TYPE "public"."assessment_type" AS ENUM('exam', 'assignment', 'project', 'presentation', 'homework', 'other');--> statement-breakpoint
CREATE TYPE "public"."assessment_status" AS ENUM('pending', 'completed');--> statement-breakpoint
CREATE TABLE "assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "assessment_type" DEFAULT 'other' NOT NULL,
	"status" "assessment_status" DEFAULT 'pending' NOT NULL,
	"due_date" date,
	"score" numeric(5, 2),
	"weight" numeric(5, 2),
	"subject_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_subjectId_idx" ON "assessment" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "assessment_userId_idx" ON "assessment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assessment_status_idx" ON "assessment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessment_dueDate_idx" ON "assessment" USING btree ("due_date");
