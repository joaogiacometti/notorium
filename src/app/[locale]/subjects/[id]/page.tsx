import { notFound } from "next/navigation";
import { getAssessmentsBySubject } from "@/app/actions/assessments";
import { getMissesBySubject } from "@/app/actions/attendance";
import { getFlashcardsBySubject } from "@/app/actions/flashcards";
import { getNotesBySubject } from "@/app/actions/notes";
import { getSubjectById } from "@/app/actions/subjects";
import { SubjectDetail } from "@/components/subject-detail";
import { requireSession } from "@/lib/auth";
import type { UserPlan } from "@/lib/plan-limits";

interface SubjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const session = await requireSession();

  const { id } = await params;
  const [subject, notes, misses, assessments, flashcards] = await Promise.all([
    getSubjectById(id),
    getNotesBySubject(id),
    getMissesBySubject(id),
    getAssessmentsBySubject(id),
    getFlashcardsBySubject(id),
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
        flashcards={flashcards}
        plan={(session.user.plan ?? "free") as UserPlan}
      />
    </main>
  );
}
