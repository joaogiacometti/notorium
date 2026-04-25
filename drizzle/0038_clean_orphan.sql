CREATE TABLE "assessment_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"assessment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_attachment_blob_pathname_unique" UNIQUE("blob_pathname")
);
--> statement-breakpoint
ALTER TABLE "assessment_attachment" ADD CONSTRAINT "assessment_attachment_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attachment" ADD CONSTRAINT "assessment_attachment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_attachment_assessmentId_idx" ON "assessment_attachment" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_attachment_userId_idx" ON "assessment_attachment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assessment_attachment_userId_assessmentId_idx" ON "assessment_attachment" USING btree ("user_id","assessment_id");