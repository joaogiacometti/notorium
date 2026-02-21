CREATE TABLE "attendance_miss" (
	"id" text PRIMARY KEY NOT NULL,
	"miss_date" date NOT NULL,
	"subject_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_miss_unique" UNIQUE("subject_id","miss_date","user_id")
);
--> statement-breakpoint
ALTER TABLE "subject" ADD COLUMN "total_classes" integer;--> statement-breakpoint
ALTER TABLE "subject" ADD COLUMN "max_misses" integer;--> statement-breakpoint
ALTER TABLE "attendance_miss" ADD CONSTRAINT "attendance_miss_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_miss" ADD CONSTRAINT "attendance_miss_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_miss_subjectId_idx" ON "attendance_miss" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "attendance_miss_userId_idx" ON "attendance_miss" USING btree ("user_id");