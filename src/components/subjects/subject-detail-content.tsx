import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { DocumentsList } from "@/components/documents/documents-list";
import { SubjectAssessmentsSummary } from "@/components/subjects/subject-assessments-summary";
import { Separator } from "@/components/ui/separator";
import type { DocumentListItem } from "@/features/documents/types";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

interface SubjectDetailContentProps {
  subject: SubjectEntity;
  documents: DocumentListItem[];
  misses: AttendanceMissEntity[];
  assessments: AssessmentEntity[];
  showAssessmentActions?: boolean;
}

/**
 * Renders the read-only subject detail body without edit, archive, or delete dialogs.
 *
 * @example
 * <SubjectDetailContent subject={subject} documents={documents} misses={misses} assessments={assessments} />
 */
export function SubjectDetailContent({
  subject,
  documents,
  misses,
  assessments,
  showAssessmentActions = true,
}: Readonly<SubjectDetailContentProps>) {
  return (
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

      <Separator className="my-8" />
      <DocumentsList subjectId={subject.id} documents={documents} />
    </>
  );
}
