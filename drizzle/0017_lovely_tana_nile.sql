CREATE TYPE "public"."user_access_status" AS ENUM('pending', 'approved', 'blocked');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "access_status" "user_access_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;