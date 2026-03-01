import { Archive, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getArchivedSubjects } from "@/app/actions/subjects";
import { ArchivedSubjectCard } from "@/components/archived-subject-card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";

export default async function ArchivedSubjectsPage() {
  await requireSession();
  const archivedSubjects = await getArchivedSubjects();

  return (
    <main>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
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

        <div className="mb-8 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Archive className="size-4" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Archived Subjects
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {archivedSubjects.length} archived subject
              {archivedSubjects.length === 1 ? "" : "s"}
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
      </div>
    </main>
  );
}
