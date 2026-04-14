ALTER TABLE "user" ADD COLUMN "notifications_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "notification_days_before" integer DEFAULT 1 NOT NULL;