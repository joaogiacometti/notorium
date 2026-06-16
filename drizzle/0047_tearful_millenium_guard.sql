CREATE TABLE "library_book" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"file_name" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"total_pages" integer,
	"current_page" integer DEFAULT 1 NOT NULL,
	"last_read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "library_book_blob_pathname_unique" UNIQUE("blob_pathname")
);
--> statement-breakpoint
ALTER TABLE "library_book" ADD CONSTRAINT "library_book_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "library_book_userId_idx" ON "library_book" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "library_book_userId_updatedAt_idx" ON "library_book" USING btree ("user_id","updated_at");