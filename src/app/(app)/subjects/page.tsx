import { BookOpen } from "lucide-react";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { SubjectsList } from "@/components/subjects/subjects-list";
import {
  getArchivedSubjectsForUser,
  getSubjectsForUser,
} from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

export default async function SubjectsPage() {
  const session = await requireSession();

  const [subjects, archived] = await Promise.all([
    getSubjectsForUser(session.user.id),
    getArchivedSubjectsForUser(session.user.id),
  ]);

  return (
    <main>
      <AppPageContainer>
        <div className="mb-6 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              Subjects
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              Manage your courses and track progress.
            </p>
          </div>
        </div>

        <SubjectsList subjects={subjects} archivedCount={archived.length} />
      </AppPageContainer>
    </main>
  );
}
