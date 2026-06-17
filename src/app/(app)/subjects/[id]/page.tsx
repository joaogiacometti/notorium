import { notFound } from "next/navigation";
import { SubjectDetail } from "@/components/subjects/subject-detail";
import { getAssessmentsBySubjectForUser } from "@/features/assessments/queries";
import { getMissesBySubjectForUser } from "@/features/attendance/queries";
import { getSubjectDocumentsForUser } from "@/features/documents/queries";
import { isAcademicSubject } from "@/features/subjects/constants";
import {
  getSubjectAncestors,
  getSubjectByIdForUser,
  getSubjectTreeForUser,
} from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";
import { findSubjectTreeNode } from "@/lib/trees/subject-tree";

interface SubjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectPage({
  params,
}: Readonly<SubjectPageProps>) {
  const session = await requireSession();

  const { id } = await params;
  const [subject, documents, ancestors, tree] = await Promise.all([
    getSubjectByIdForUser(session.user.id, id),
    getSubjectDocumentsForUser(session.user.id, id),
    getSubjectAncestors(session.user.id, id),
    getSubjectTreeForUser(session.user.id),
  ]);

  if (!subject) {
    notFound();
  }

  const childSubjects = findSubjectTreeNode(tree, id)?.children ?? [];

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
        ancestors={ancestors}
        childSubjects={childSubjects}
        documents={documents}
        misses={misses}
        assessments={assessments}
      />
    </main>
  );
}
