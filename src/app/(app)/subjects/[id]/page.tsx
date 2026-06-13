import { notFound } from "next/navigation";
import { SubjectDetail } from "@/components/subjects/subject-detail";
import { getAssessmentsBySubjectForUser } from "@/features/assessments/queries";
import { getMissesBySubjectForUser } from "@/features/attendance/queries";
import { getSubjectDocumentsForUser } from "@/features/documents/queries";
import { isAcademicSubject } from "@/features/subjects/constants";
import { getActiveSubjectByIdForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

interface SubjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectPage({
  params,
}: Readonly<SubjectPageProps>) {
  const session = await requireSession();

  const { id } = await params;
  const [subject, documents] = await Promise.all([
    getActiveSubjectByIdForUser(session.user.id, id),
    getSubjectDocumentsForUser(session.user.id, id),
  ]);

  if (!subject) {
    notFound();
  }

  const [misses, assessments] = isAcademicSubject(subject.kind)
    ? await Promise.all([
        getMissesBySubjectForUser(session.user.id, id),
        getAssessmentsBySubjectForUser(session.user.id, id),
      ])
    : [[], []];

  return (
    <main>
      <SubjectDetail
        subject={subject}
        documents={documents}
        misses={misses}
        assessments={assessments}
      />
    </main>
  );
}
