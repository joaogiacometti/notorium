CREATE TABLE "pdf_document" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"page_count" integer,
	"last_page" integer DEFAULT 1 NOT NULL,
	"subject_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pdf_document_blob_pathname_unique" UNIQUE("blob_pathname")
);
--> statement-breakpoint
ALTER TABLE "pdf_document" ADD CONSTRAINT "pdf_document_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_document" ADD CONSTRAINT "pdf_document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pdf_document_subjectId_idx" ON "pdf_document" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "pdf_document_userId_idx" ON "pdf_document" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pdf_document_userId_updatedAt_idx" ON "pdf_document" USING btree ("user_id","updated_at");