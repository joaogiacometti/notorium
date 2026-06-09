CREATE TABLE "mindmap" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"data" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mindmap" ADD CONSTRAINT "mindmap_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mindmap_userId_idx" ON "mindmap" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mindmap_userId_updatedAt_idx" ON "mindmap" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "mindmap_title_trgm_idx" ON "mindmap" USING gin ("title" gin_trgm_ops);