import { notFound } from "next/navigation";
import { SubjectDetail } from "@/components/subject-detail";
import { getAssessmentsBySubjectForUser } from "@/features/assessments/queries";
import { getMissesBySubjectForUser } from "@/features/attendance/queries";
import { getNotesBySubjectForUser } from "@/features/notes/queries";
import { getActiveSubjectByIdForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth";

interface SubjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const session = await requireSession();

  const { id } = await params;
  const [subject, notes, misses, assessments] = await Promise.all([
    getActiveSubjectByIdForUser(session.user.id, id),
    getNotesBySubjectForUser(session.user.id, id),
    getMissesBySubjectForUser(session.user.id, id),
    getAssessmentsBySubjectForUser(session.user.id, id),
  ]);

  if (!subject) {
    notFound();
  }

  return (
    <main>
      <SubjectDetail
        subject={subject}
        notes={notes}
        misses={misses}
        assessments={assessments}
      />
    </main>
  );
}
