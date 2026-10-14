import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { SubjectAssessmentsSummary } from "@/components/subjects/subject-assessments-summary";
import { Separator } from "@/components/ui/separator";
import { isAcademicSubject } from "@/features/subjects/constants";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

interface SubjectDetailContentProps {
  subject: SubjectEntity;
  misses: AttendanceMissEntity[];
  assessments: AssessmentEntity[];
  showAssessmentActions?: boolean;
}

/**
 * Renders a subject's page body. Academic subjects show their attendance and
 * assessment dashboards — the only things the sidebar tree can't surface.
 * Everything else (documents, flashcards, subfolders) is created and browsed in
 * the sidebar, so general subjects (which have no attendance or assessments)
 * fall back to a short pointer to it. The subject name and path live in the
 * breadcrumb top bar, so this body carries no title block.
 *
 * @example
 * <SubjectDetailContent subject={subject} misses={misses} assessments={assessments} />
 */
export function SubjectDetailContent({
  subject,
  misses,
  assessments,
  showAssessmentActions = true,
}: Readonly<SubjectDetailContentProps>) {
  if (!isAcademicSubject(subject.kind)) {
    return <GeneralSubjectNotice />;
  }

  return (
    <div>
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
    </div>
  );
}

/**
 * Fallback body for a general subject, which has no attendance or assessment
 * tracking. Its notes, mindmaps, and subfolders are managed in the sidebar
 * tree, so the page only needs to point there.
 */
function GeneralSubjectNotice() {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5 sm:p-6">
      <h2 className="text-base font-semibold">Managed in the sidebar</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Open this subject's notes, mindmaps, and subfolders from the subject
        tree on the left.
      </p>
    </div>
  );
}
