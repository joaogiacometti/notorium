DROP TABLE IF EXISTS "note_image_attachment" CASCADE;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'user_access_status'
	) THEN
		CREATE TYPE "public"."user_access_status" AS ENUM('pending', 'approved', 'blocked');
	END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "access_status" "user_access_status";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "access_status" SET DEFAULT 'pending';--> statement-breakpoint
UPDATE "user" SET "access_status" = 'pending' WHERE "access_status" IS NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "access_status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_admin" boolean;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "is_admin" SET DEFAULT false;--> statement-breakpoint
UPDATE "user" SET "is_admin" = false WHERE "is_admin" IS NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "is_admin" SET NOT NULL;
