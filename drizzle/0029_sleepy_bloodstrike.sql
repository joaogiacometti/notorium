CREATE TABLE "deck" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"subject_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_userId_subjectId_name_unique" UNIQUE("user_id","subject_id","name")
);
--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "deck_id" text;--> statement-breakpoint
ALTER TABLE "deck" ADD CONSTRAINT "deck_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck" ADD CONSTRAINT "deck_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_subjectId_idx" ON "deck" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "deck_userId_idx" ON "deck" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deck_userId_subjectId_idx" ON "deck" USING btree ("user_id","subject_id");--> statement-breakpoint
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flashcard_deckId_idx" ON "flashcard" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "flashcard_userId_deckId_updatedAt_idx" ON "flashcard" USING btree ("user_id","deck_id","updated_at");