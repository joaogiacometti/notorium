CREATE TYPE "public"."subject_kind" AS ENUM('academic', 'general');--> statement-breakpoint
ALTER TABLE "subject" ADD COLUMN "kind" "subject_kind" DEFAULT 'academic' NOT NULL;--> statement-breakpoint
CREATE INDEX "subject_userId_kind_archivedAt_idx" ON "subject" USING btree ("user_id","kind","archived_at");