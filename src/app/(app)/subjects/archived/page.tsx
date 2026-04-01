import { Archive, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { ArchivedSubjectCard } from "@/components/subjects/archived-subject-card";
import { Button } from "@/components/ui/button";
import { getArchivedSubjectsForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

export default async function ArchivedSubjectsPage() {
  const session = await requireSession();
  const archivedSubjects = await getArchivedSubjectsForUser(session.user.id);
  const count = archivedSubjects.length;
  const countLabel =
    count === 1 ? "1 archived subject" : `${count} archived subjects`;

  return (
    <main>
      <AppPageContainer maxWidth="5xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/subjects">
              <ArrowLeft className="size-4" />
              Back to Subjects
            </Link>
          </Button>
        </div>

        <div className="mb-6 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Archive className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              Archived Subjects
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              {countLabel}
            </p>
          </div>
        </div>

        {archivedSubjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6">
            <h2 className="text-base font-semibold">No archived subjects</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Archived subjects will show up here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archivedSubjects.map((subject) => (
              <ArchivedSubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </AppPageContainer>
    </main>
  );
}
