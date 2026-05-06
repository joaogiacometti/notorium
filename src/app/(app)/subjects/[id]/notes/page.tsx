import { notFound } from "next/navigation";
import { SubjectNotesListPage } from "@/components/notes/subject-notes-list-page";
import { getNotesBySubjectForUser } from "@/features/notes/queries";
import { getActiveSubjectByIdForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

interface SubjectNotesPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectNotesPage({
  params,
}: Readonly<SubjectNotesPageProps>) {
  const session = await requireSession();
  const { id } = await params;
  const [subject, notes] = await Promise.all([
    getActiveSubjectByIdForUser(session.user.id, id),
    getNotesBySubjectForUser(session.user.id, id),
  ]);

  if (!subject) {
    notFound();
  }

  return (
    <main>
      <SubjectNotesListPage subject={subject} notes={notes} />
    </main>
  );
}
