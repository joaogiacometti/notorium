import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { CreateDocumentMenu } from "@/components/documents/create-document-menu";
import { DocumentsList } from "@/components/documents/documents-list";
import { SubjectAssessmentsSummary } from "@/components/subjects/subject-assessments-summary";
import { SubjectSubfolderGrid } from "@/components/subjects/subject-subfolder-grid";
import { Separator } from "@/components/ui/separator";
import type { DocumentListItem } from "@/features/documents/types";
import { isAcademicSubject } from "@/features/subjects/constants";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
  SubjectEntity,
  SubjectTreeNode,
} from "@/lib/server/api-contracts";

interface SubjectDetailContentProps {
  subject: SubjectEntity;
  childSubjects: SubjectTreeNode[];
  documents: DocumentListItem[];
  misses: AttendanceMissEntity[];
  assessments: AssessmentEntity[];
  showAssessmentActions?: boolean;
}

/**
 * Renders a subject's "home": the academic attendance/assessment summaries
 * (root academic subjects only), subfolder cards to browse deeper, and the
 * subject's full document list with its Create action. The subject name and
 * path live in the breadcrumb top bar, so this body carries no title block.
 *
 * @example
 * <SubjectDetailContent subject={subject} childSubjects={node.children} documents={documents} misses={misses} assessments={assessments} />
 */
export function SubjectDetailContent({
  subject,
  childSubjects,
  documents,
  misses,
  assessments,
  showAssessmentActions = true,
}: Readonly<SubjectDetailContentProps>) {
  const isAcademic = isAcademicSubject(subject.kind);
  const hasSummaries = isAcademic;
  const hasSubfolders = childSubjects.length > 0;

  return (
    <div>
      {hasSummaries ? (
        <>
          <AttendanceSummary
            subjectId={subject.id}
            totalClasses={subject.totalClasses}
            maxMisses={subject.maxMisses}
            misses={misses}
          />
          <Separator className="my-8" />
          <SubjectAssessmentsSummary
            assessments={assessments}
            subjectId={subject.id}
            showManageAction={showAssessmentActions}
          />
        </>
      ) : null}

      {hasSubfolders ? (
        <>
          {hasSummaries ? <Separator className="my-8" /> : null}
          <SubjectSubfolderGrid childSubjects={childSubjects} />
        </>
      ) : null}

      {hasSummaries || hasSubfolders ? <Separator className="my-8" /> : null}
      <DocumentsSection subject={subject} documents={documents} />
    </div>
  );
}

interface DocumentsSectionProps {
  subject: SubjectEntity;
  documents: DocumentListItem[];
}

function DocumentsSection({
  subject,
  documents,
}: Readonly<DocumentsSectionProps>) {
  const noteCount = documents.filter((item) => item.kind === "note").length;
  const mindmapCount = documents.length - noteCount;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Documents</h2>
        <CreateDocumentMenu
          subjectId={subject.id}
          noteCount={noteCount}
          mindmapCount={mindmapCount}
        />
      </div>
      <DocumentsList documents={documents} />
    </div>
  );
}
