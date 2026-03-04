CREATE TABLE "flashcard" (
	"id" text PRIMARY KEY NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"subject_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subject" ADD COLUMN "flashcards_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flashcard_subjectId_idx" ON "flashcard" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "flashcard_userId_idx" ON "flashcard" USING btree ("user_id");