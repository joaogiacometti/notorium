import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { NotesList } from "@/components/notes/notes-list";
import { SubjectAssessmentsSummary } from "@/components/subjects/subject-assessments-summary";
import { Separator } from "@/components/ui/separator";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
  NoteEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

interface SubjectDetailContentProps {
  subject: SubjectEntity;
  notes: NoteEntity[];
  misses: AttendanceMissEntity[];
  assessments: AssessmentEntity[];
  showAssessmentActions?: boolean;
}

/**
 * Renders the read-only subject detail body without edit, archive, or delete dialogs.
 *
 * @example
 * <SubjectDetailContent subject={subject} notes={notes} misses={misses} assessments={assessments} />
 */
export function SubjectDetailContent({
  subject,
  notes,
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
      <NotesList subjectId={subject.id} notes={notes} />
    </>
  );
}
