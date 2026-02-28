CREATE TYPE "public"."user_plan" AS ENUM('free', 'unlimited');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "plan" "user_plan" DEFAULT 'free' NOT NULL;