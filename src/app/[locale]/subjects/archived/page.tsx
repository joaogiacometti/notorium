import { Archive, ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { ArchivedSubjectCard } from "@/components/subjects/archived-subject-card";
import { Button } from "@/components/ui/button";
import { getArchivedSubjectsForUser } from "@/features/subjects/queries";
import { Link } from "@/i18n/routing";
import { requireSession } from "@/lib/auth/auth";

export default async function ArchivedSubjectsPage() {
  const session = await requireSession();
  const t = await getTranslations("ArchivedSubjectsPage");
  const archivedSubjects = await getArchivedSubjectsForUser(session.user.id);

  return (
    <main>
      <AppPageContainer maxWidth="5xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/subjects">
              <ArrowLeft className="size-4" />
              {t("back")}
            </Link>
          </Button>
        </div>

        <div className="mb-10 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Archive className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              {t("count", { count: archivedSubjects.length })}
            </p>
          </div>
        </div>

        {archivedSubjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6">
            <h2 className="text-base font-semibold">{t("empty_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("empty_description")}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archivedSubjects.map((subject) => (
              <ArchivedSubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </AppPageContainer>
    </main>
  );
}
