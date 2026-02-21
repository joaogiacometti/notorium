CREATE TABLE "grade" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"value" numeric(5, 2) NOT NULL,
	"category_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weight" numeric(5, 2),
	"subject_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_category_id_grade_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."grade_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_category" ADD CONSTRAINT "grade_category_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_category" ADD CONSTRAINT "grade_category_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grade_categoryId_idx" ON "grade" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "grade_userId_idx" ON "grade" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "grade_category_subjectId_idx" ON "grade_category" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "grade_category_userId_idx" ON "grade_category" USING btree ("user_id");