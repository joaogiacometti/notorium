DROP INDEX "subject_userId_archivedAt_idx";--> statement-breakpoint
DROP INDEX "subject_userId_kind_archivedAt_idx";--> statement-breakpoint
DROP INDEX "subject_userId_archivedAt_updatedAt_idx";--> statement-breakpoint
ALTER TABLE "subject" DROP COLUMN "archived_at";