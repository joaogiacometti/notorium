import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import type { BreadcrumbItem } from "@/components/shared/page-top-bar";
import { SubjectDetailContent } from "@/components/subjects/subject-detail-content";
import { isAcademicSubject } from "@/features/subjects/constants";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

interface SubjectDetailProps {
  subject: SubjectEntity;
  ancestors: SubjectEntity[];
  misses: AttendanceMissEntity[];
  assessments: AssessmentEntity[];
}

/**
 * Subject page body. Editing, renaming, and deleting a subject all live in the
 * left menu's subject tree, so this view is the full-path breadcrumb top bar and
 * the subject's academic attendance/assessment dashboards.
 */
export function SubjectDetail({
  subject,
  ancestors,
  misses,
  assessments,
}: Readonly<SubjectDetailProps>) {
  return (
    <DetailPageLayout
      breadcrumb={buildSubjectBreadcrumb(subject, ancestors)}
      maxWidth="5xl"
    >
      <SubjectDetailContent
        subject={subject}
        misses={misses}
        assessments={assessments}
      />
    </DetailPageLayout>
  );
}

/**
 * Builds the full ancestor path for the top bar, e.g.
 * `Math / bruh / kjfheasfklaes`. Ancestors arrive root-first; the current
 * subject is the unlinked final crumb. Only academic ancestors are linked,
 * since general subjects have no page (they live only in the sidebar tree).
 */
function buildSubjectBreadcrumb(
  subject: SubjectEntity,
  ancestors: SubjectEntity[],
): BreadcrumbItem[] {
  const ancestorCrumbs: BreadcrumbItem[] = ancestors.map((ancestor, index) => ({
    label: ancestor.name,
    href: isAcademicSubject(ancestor.kind)
      ? `/subjects/${ancestor.id}`
      : undefined,
    icon: index === 0 ? "book-open" : undefined,
  }));

  return [
    ...ancestorCrumbs,
    {
      label: subject.name,
      icon: ancestorCrumbs.length === 0 ? "book-open" : undefined,
    },
  ];
}
