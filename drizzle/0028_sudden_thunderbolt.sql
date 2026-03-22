CREATE TABLE "instance_state" (
	"id" text PRIMARY KEY NOT NULL,
	"initial_admin_user_id" text NOT NULL,
	"initial_admin_assigned_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
