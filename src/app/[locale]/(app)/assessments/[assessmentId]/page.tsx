import { notFound } from "next/navigation";
import { AssessmentDetail } from "@/components/assessments/assessment-detail";
import { getAssessmentDetailForUser } from "@/features/assessments/queries";
import { requireSession } from "@/lib/auth/auth";

interface AssessmentPageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function AssessmentPage({
  params,
}: Readonly<AssessmentPageProps>) {
  const session = await requireSession();
  const { assessmentId } = await params;
  const detail = await getAssessmentDetailForUser(
    session.user.id,
    assessmentId,
  );

  if (!detail) {
    notFound();
  }

  return (
    <main>
      <AssessmentDetail detail={detail} />
    </main>
  );
}
