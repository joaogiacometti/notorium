import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { DocumentsNav } from "@/components/documents/documents-nav";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { Button } from "@/components/ui/button";
import type { DocumentListItem } from "@/features/documents/types";
import type { DeckOption, SubjectEntity } from "@/lib/server/api-contracts";

interface SubjectDocumentsListPageProps {
  aiEnabled: boolean;
  decks: DeckOption[];
  documents: DocumentListItem[];
  subject: SubjectEntity;
}

/**
 * Renders the full documents list for one subject (notes and mindmaps).
 *
 * @example
 * <SubjectDocumentsListPage subject={subject} documents={documents} aiEnabled decks={decks} />
 */
export function SubjectDocumentsListPage({
  aiEnabled,
  decks,
  documents,
  subject,
}: Readonly<SubjectDocumentsListPageProps>) {
  return (
    <AppPageContainer
      maxWidth="7xl"
      className="lg:flex lg:h-[calc(100svh-4rem)] lg:flex-col lg:overflow-hidden lg:pb-6"
    >
      <div className="mb-4 flex shrink-0 items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={`/subjects/${subject.id}`}>
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <h1 className="truncate text-lg font-semibold">{subject.name}</h1>
      </div>
      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <DocumentsNav
          subjectId={subject.id}
          subjectName={subject.name}
          documents={documents}
          aiEnabled={aiEnabled}
          decks={decks}
        />
        <section className="hidden min-h-72 items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/15 text-center lg:flex">
          <div className="max-w-xs px-6">
            <FileText className="mx-auto size-8 text-muted-foreground/70" />
            <h2 className="mt-3 text-base font-semibold">Select a document</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a note or mindmap from the list to view and edit it.
            </p>
          </div>
        </section>
      </div>
    </AppPageContainer>
  );
}
