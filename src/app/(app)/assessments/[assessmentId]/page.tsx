import { redirect } from "next/navigation";
import { AssessmentDetail } from "@/components/assessments/assessment-detail";
import type { BreadcrumbItem } from "@/components/shared/page-top-bar";
import { getAssessmentDetailForUser } from "@/features/assessments/queries";
import { requireSession } from "@/lib/auth/auth";
import { isMediaStorageConfigured } from "@/lib/media-storage/provider";
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
  const attachmentsEnabled = isMediaStorageConfigured();

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

  const rootCrumb: BreadcrumbItem =
    backLink.label === "planning"
      ? { label: "Planning", href: backLink.href }
      : {
          label: detail.subject.name,
          href: `/subjects/${detail.subject.id}`,
          icon: "book-open",
        };

  return (
    <main>
      <AssessmentDetail
        breadcrumb={[rootCrumb, { label: detail.assessment.title }]}
        returnHref={backLink.href}
        attachmentsEnabled={attachmentsEnabled}
        detail={detail}
      />
    </main>
  );
}
