import { ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { GradesSummary } from "@/components/subjects/grades-summary";
import { getAssessmentsForUser } from "@/features/assessments/queries";
import { getSubjectsForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

export default async function AssessmentsPage() {
  const session = await requireSession();
  const t = await getTranslations("AssessmentsPage");

  const [assessments, subjects] = await Promise.all([
    getAssessmentsForUser(session.user.id),
    getSubjectsForUser(session.user.id),
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
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              {t("description")}
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
