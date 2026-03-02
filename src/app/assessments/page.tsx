import { ClipboardList } from "lucide-react";
import { getAssessments } from "@/app/actions/assessments";
import { getSubjects } from "@/app/actions/subjects";
import { GradesSummary } from "@/components/grades-summary";
import { requireSession } from "@/lib/auth";

export default async function AssessmentsPage() {
  await requireSession();

  const [assessments, subjects] = await Promise.all([
    getAssessments(),
    getSubjects(),
  ]);

  const subjectNamesById = Object.fromEntries(
    subjects.map((subject) => [subject.id, subject.name]),
  );

  return (
    <main>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word text-2xl font-bold tracking-tight">
              All Assessments
            </h1>
            <p className="mt-1.5 wrap-break-word text-sm text-muted-foreground">
              Detailed view across all subjects with global filters.
            </p>
          </div>
        </div>

        <GradesSummary
          assessments={assessments}
          showHeader={false}
          showAverage={false}
          showSubjectFilter
          subjectNamesById={subjectNamesById}
        />
      </div>
    </main>
  );
}
