CREATE TABLE "note_image_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"user_id" text NOT NULL,
	"blob_url" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "note_image_attachment_blobPathname_unique" UNIQUE("blob_pathname")
);
--> statement-breakpoint
ALTER TABLE "note_image_attachment" ADD CONSTRAINT "note_image_attachment_note_id_note_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."note"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_image_attachment" ADD CONSTRAINT "note_image_attachment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_image_attachment_noteId_idx" ON "note_image_attachment" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "note_image_attachment_userId_idx" ON "note_image_attachment" USING btree ("user_id");
