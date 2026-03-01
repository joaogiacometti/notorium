ALTER TABLE "subject" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
CREATE INDEX "subject_userId_archivedAt_idx" ON "subject" USING btree ("user_id","archived_at");