import { redirect } from "next/navigation";
import { AssessmentDetail } from "@/components/assessments/assessment-detail";
import { getAssessmentDetailForUser } from "@/features/assessments/queries";
import { requireSession } from "@/lib/auth/auth";
import { resolveAssessmentDetailBackLink } from "@/lib/navigation/detail-page-back-link";

interface AssessmentPageProps {
  params: Promise<{ assessmentId: string }>;
  searchParams: Promise<{ from?: string; subjectId?: string }>;
}

export default async function AssessmentPage({
  params,
  searchParams,
}: Readonly<AssessmentPageProps>) {
  const session = await requireSession();
  const { assessmentId } = await params;
  const returnContext = await searchParams;
  const detail = await getAssessmentDetailForUser(
    session.user.id,
    assessmentId,
  );

  if (!detail) {
    const backLink = resolveAssessmentDetailBackLink(
      returnContext,
      returnContext.subjectId ?? "",
    );
    redirect(backLink.href);
  }

  const backLink = resolveAssessmentDetailBackLink(
    returnContext,
    detail.subject.id,
  );

  const backLabel =
    backLink.label === "flashcards"
      ? "Back to Flashcards"
      : backLink.label === "planning"
        ? "Back to Planning"
        : "Back to Subject";

  return (
    <main>
      <AssessmentDetail
        backHref={backLink.href}
        backLabel={backLabel}
        detail={detail}
      />
    </main>
  );
}
