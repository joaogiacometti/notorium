import { notFound } from "next/navigation";
import { SubjectDocumentsListPage } from "@/components/documents/subject-documents-list-page";
import { getAllDecksWithPathsForUser } from "@/features/decks/queries";
import { getSubjectDocumentsForUser } from "@/features/documents/queries";
import { getActiveSubjectByIdForUser } from "@/features/subjects/queries";
import { isAiEnabled } from "@/lib/ai/config";
import { requireSession } from "@/lib/auth/auth";

interface SubjectDocumentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectDocumentsPage({
  params,
}: Readonly<SubjectDocumentsPageProps>) {
  const session = await requireSession();
  const { id } = await params;
  // Decks feed the note rows' "Generate flashcards" action in the sidebar.
  const [subject, documents, decks] = await Promise.all([
    getActiveSubjectByIdForUser(session.user.id, id),
    getSubjectDocumentsForUser(session.user.id, id),
    getAllDecksWithPathsForUser(session.user.id),
  ]);

  if (!subject) {
    notFound();
  }

  return (
    <main>
      <SubjectDocumentsListPage
        aiEnabled={isAiEnabled()}
        decks={decks}
        subject={subject}
        documents={documents}
      />
    </main>
  );
}
