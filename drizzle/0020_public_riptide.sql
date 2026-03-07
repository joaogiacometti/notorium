CREATE TYPE "public"."flashcard_review_rating" AS ENUM('again', 'hard', 'good', 'easy');--> statement-breakpoint
CREATE TABLE "flashcard_review_log" (
	"id" text PRIMARY KEY NOT NULL,
	"flashcard_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" "flashcard_review_rating" NOT NULL,
	"reviewed_at" timestamp NOT NULL,
	"days_elapsed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard_scheduler_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"desired_retention" numeric(4, 3) DEFAULT '0.900' NOT NULL,
	"weights" text NOT NULL,
	"optimized_review_count" integer DEFAULT 0 NOT NULL,
	"last_optimized_at" timestamp,
	"legacy_scheduler_migrated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "flashcard_scheduler_settings_userId_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "stability" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "flashcard" ADD COLUMN "difficulty" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "flashcard_review_log" ADD CONSTRAINT "flashcard_review_log_flashcard_id_flashcard_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcard"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_log" ADD CONSTRAINT "flashcard_review_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_scheduler_settings" ADD CONSTRAINT "flashcard_scheduler_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flashcard_review_log_flashcardId_idx" ON "flashcard_review_log" USING btree ("flashcard_id");--> statement-breakpoint
CREATE INDEX "flashcard_review_log_userId_idx" ON "flashcard_review_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "flashcard_review_log_userId_reviewedAt_idx" ON "flashcard_review_log" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "flashcard_scheduler_settings_userId_idx" ON "flashcard_scheduler_settings" USING btree ("user_id");