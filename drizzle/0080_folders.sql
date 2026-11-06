ALTER TABLE "subject" RENAME TO "folder";--> statement-breakpoint
ALTER TABLE "folder" RENAME CONSTRAINT "subject_pkey" TO "folder_pkey";--> statement-breakpoint
ALTER TABLE "flashcard" RENAME COLUMN "subject_id" TO "folder_id";--> statement-breakpoint
ALTER TABLE "flashcard_review_log" RENAME COLUMN "subject_id" TO "folder_id";--> statement-breakpoint
ALTER TABLE "note" RENAME COLUMN "subject_id" TO "folder_id";--> statement-breakpoint
ALTER TABLE "pdf_document" RENAME COLUMN "subject_id" TO "folder_id";--> statement-breakpoint
ALTER TABLE "folder" RENAME COLUMN "parent_subject_id" TO "parent_folder_id";--> statement-breakpoint
ALTER TABLE "flashcard" DROP CONSTRAINT "flashcard_subject_id_subject_id_fk";
--> statement-breakpoint
ALTER TABLE "note" DROP CONSTRAINT "note_subject_id_subject_id_fk";
--> statement-breakpoint
ALTER TABLE "pdf_document" DROP CONSTRAINT "pdf_document_subject_id_subject_id_fk";
--> statement-breakpoint
ALTER TABLE "folder" DROP CONSTRAINT "subject_parent_subject_id_subject_id_fk";
--> statement-breakpoint
ALTER TABLE "folder" DROP CONSTRAINT "subject_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "flashcard_subjectId_idx";--> statement-breakpoint
DROP INDEX "flashcard_userId_subjectId_updatedAt_idx";--> statement-breakpoint
DROP INDEX "flashcard_review_log_subjectId_idx";--> statement-breakpoint
DROP INDEX "note_subjectId_idx";--> statement-breakpoint
DROP INDEX "pdf_document_subjectId_idx";--> statement-breakpoint
DROP INDEX "subject_userId_parentSubjectId_name_unique";--> statement-breakpoint
DROP INDEX "subject_parentSubjectId_idx";--> statement-breakpoint
DROP INDEX "subject_userId_idx";--> statement-breakpoint
DROP INDEX "subject_name_unaccent_trgm_idx";--> statement-breakpoint
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_folder_id_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_folder_id_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_document" ADD CONSTRAINT "pdf_document_folder_id_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_parent_folder_id_folder_id_fk" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flashcard_folderId_idx" ON "flashcard" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "flashcard_userId_folderId_updatedAt_idx" ON "flashcard" USING btree ("user_id","folder_id","updated_at");--> statement-breakpoint
CREATE INDEX "flashcard_review_log_folderId_idx" ON "flashcard_review_log" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "note_folderId_idx" ON "note" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "pdf_document_folderId_idx" ON "pdf_document" USING btree ("folder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "folder_userId_parentFolderId_name_unique" ON "folder" USING btree ("user_id",coalesce("parent_folder_id", '__root_folder__'),"name");--> statement-breakpoint
CREATE INDEX "folder_parentFolderId_idx" ON "folder" USING btree ("parent_folder_id");--> statement-breakpoint
CREATE INDEX "folder_userId_idx" ON "folder" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "folder_name_unaccent_trgm_idx" ON "folder" USING gin (immutable_unaccent("name") gin_trgm_ops);
