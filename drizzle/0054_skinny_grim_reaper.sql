CREATE TABLE "library_annotation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"book_id" text NOT NULL,
	"annotation_uid" text NOT NULL,
	"page_index" integer NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "library_annotation_book_uid_key" UNIQUE("book_id","annotation_uid")
);
--> statement-breakpoint
ALTER TABLE "library_annotation" ADD CONSTRAINT "library_annotation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_annotation" ADD CONSTRAINT "library_annotation_book_id_library_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."library_book"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "library_annotation_userId_idx" ON "library_annotation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "library_annotation_bookId_idx" ON "library_annotation" USING btree ("book_id");