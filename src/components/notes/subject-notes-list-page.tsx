import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { NoteSidebar } from "@/components/notes/note-sidebar";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { Button } from "@/components/ui/button";
import type { NoteEntity, SubjectEntity } from "@/lib/server/api-contracts";

interface SubjectNotesListPageProps {
  notes: NoteEntity[];
  subject: SubjectEntity;
}

/**
 * Renders the simple full notes list for one subject.
 *
 * @example
 * <SubjectNotesListPage subject={subject} notes={notes} />
 */
export function SubjectNotesListPage({
  notes,
  subject,
}: Readonly<SubjectNotesListPageProps>) {
  return (
    <AppPageContainer
      maxWidth="5xl"
      className="lg:flex lg:h-[calc(100svh-4rem)] lg:flex-col lg:overflow-hidden lg:pb-6"
    >
      <div className="mb-4 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={`/subjects/${subject.id}`}>
            <ArrowLeft className="size-4" />
            Back to Subject
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <NoteSidebar subjectId={subject.id} notes={notes} />
        <section className="hidden min-h-72 items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/15 text-center lg:flex">
          <div className="max-w-xs px-6">
            <FileText className="mx-auto size-8 text-muted-foreground/70" />
            <h2 className="mt-3 text-base font-semibold">Select a note</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a note from the list to view and edit its content.
            </p>
          </div>
        </section>
      </div>
    </AppPageContainer>
  );
}
