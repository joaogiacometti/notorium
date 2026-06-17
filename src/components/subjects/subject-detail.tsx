import { AppPageContainer } from "@/components/shared/app-page-container";
import {
  type BreadcrumbItem,
  PageTopBar,
} from "@/components/shared/page-top-bar";
import { SubjectDetailContent } from "@/components/subjects/subject-detail-content";
import type { DocumentListItem } from "@/features/documents/types";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
  SubjectEntity,
  SubjectTreeNode,
} from "@/lib/server/api-contracts";

interface SubjectDetailProps {
  subject: SubjectEntity;
  ancestors: SubjectEntity[];
  childSubjects: SubjectTreeNode[];
  documents: DocumentListItem[];
  misses: AttendanceMissEntity[];
  assessments: AssessmentEntity[];
}

/**
 * Subject page body. Editing, renaming, and deleting a subject all live in the
 * left menu's subject tree, so this view is the full-path breadcrumb top bar and
 * the subject's "home" content (summaries, subfolders, documents).
 */
export function SubjectDetail({
  subject,
  ancestors,
  childSubjects,
  documents,
  misses,
  assessments,
}: Readonly<SubjectDetailProps>) {
  return (
    <>
      <PageTopBar breadcrumb={buildSubjectBreadcrumb(subject, ancestors)} />
      <AppPageContainer maxWidth="5xl">
        <SubjectDetailContent
          subject={subject}
          childSubjects={childSubjects}
          documents={documents}
          misses={misses}
          assessments={assessments}
        />
      </AppPageContainer>
    </>
  );
}

/**
 * Builds the full ancestor path for the top bar, e.g.
 * `Math / bruh / kjfheasfklaes`. Ancestors arrive root-first; each links to its
 * own page while the current subject is the unlinked final crumb.
 */
function buildSubjectBreadcrumb(
  subject: SubjectEntity,
  ancestors: SubjectEntity[],
): BreadcrumbItem[] {
  const ancestorCrumbs: BreadcrumbItem[] = ancestors.map((ancestor, index) => ({
    label: ancestor.name,
    href: `/subjects/${ancestor.id}`,
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
