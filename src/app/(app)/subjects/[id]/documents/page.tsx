import { notFound } from "next/navigation";
import { SubjectDocumentsListPage } from "@/components/documents/subject-documents-list-page";
import { getSubjectDocumentsForUser } from "@/features/documents/queries";
import { getActiveSubjectByIdForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

interface SubjectDocumentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectDocumentsPage({
  params,
}: Readonly<SubjectDocumentsPageProps>) {
  const session = await requireSession();
  const { id } = await params;
  const [subject, documents] = await Promise.all([
    getActiveSubjectByIdForUser(session.user.id, id),
    getSubjectDocumentsForUser(session.user.id, id),
  ]);

  if (!subject) {
    notFound();
  }

  return (
    <main>
      <SubjectDocumentsListPage subject={subject} documents={documents} />
    </main>
  );
}
