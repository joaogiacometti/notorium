CREATE INDEX "assessment_userId_dueDate_idx" ON "assessment" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "attendance_miss_userId_missDate_idx" ON "attendance_miss" USING btree ("user_id","miss_date");--> statement-breakpoint
CREATE INDEX "flashcard_userId_updatedAt_idx" ON "flashcard" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "flashcard_userId_subjectId_updatedAt_idx" ON "flashcard" USING btree ("user_id","subject_id","updated_at");--> statement-breakpoint
CREATE INDEX "note_userId_updatedAt_idx" ON "note" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "subject_userId_archivedAt_updatedAt_idx" ON "subject" USING btree ("user_id","archived_at","updated_at");