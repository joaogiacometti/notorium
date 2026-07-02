import { notFound, redirect } from "next/navigation";
import { SubjectDetail } from "@/components/subjects/subject-detail";
import { getAssessmentsBySubjectForUser } from "@/features/assessments/queries";
import { getMissesBySubjectForUser } from "@/features/attendance/queries";
import { isAcademicSubject } from "@/features/subjects/constants";
import {
  getSubjectAncestors,
  getSubjectByIdForUser,
} from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

interface SubjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectPage({
  params,
}: Readonly<SubjectPageProps>) {
  const session = await requireSession();

  const { id } = await params;
  const [subject, ancestors] = await Promise.all([
    getSubjectByIdForUser(session.user.id, id),
    getSubjectAncestors(session.user.id, id),
  ]);

  if (!subject) {
    notFound();
  }

  if (!isAcademicSubject(subject.kind)) {
    redirect("/");
  }

  const [misses, assessments] = await Promise.all([
    getMissesBySubjectForUser(session.user.id, id),
    getAssessmentsBySubjectForUser(session.user.id, id),
  ]);

  return (
    <main>
      <SubjectDetail
        subject={subject}
        ancestors={ancestors}
        misses={misses}
        assessments={assessments}
      />
    </main>
  );
}
