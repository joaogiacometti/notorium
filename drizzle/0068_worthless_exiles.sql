DROP TABLE "assessment" CASCADE;--> statement-breakpoint
DROP TABLE "attendance_miss" CASCADE;--> statement-breakpoint
DROP TABLE "notification_log" CASCADE;--> statement-breakpoint
ALTER TABLE "subject" DROP COLUMN "kind";--> statement-breakpoint
ALTER TABLE "subject" DROP COLUMN "total_classes";--> statement-breakpoint
ALTER TABLE "subject" DROP COLUMN "max_misses";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "notifications_enabled";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "notification_days_before";--> statement-breakpoint
DROP TYPE "public"."assessment_status";--> statement-breakpoint
DROP TYPE "public"."assessment_type";--> statement-breakpoint
DROP TYPE "public"."notification_status";--> statement-breakpoint
DROP TYPE "public"."subject_kind";