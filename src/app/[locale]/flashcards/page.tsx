import { Layers3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FlashcardReviewClient } from "@/components/flashcards/flashcard-review-client";
import { FlashcardsManager } from "@/components/flashcards/flashcards-manager";
import { FlashcardsViewSwitch } from "@/components/flashcards/flashcards-view-switch";
import { getFlashcardReviewState } from "@/features/flashcard-review/server";
import { getFlashcardsForUser } from "@/features/flashcards/queries";
import { resolveFlashcardsView } from "@/features/flashcards/view";
import { getSubjectsForUser } from "@/features/subjects/queries";
import { requireSession } from "@/lib/auth/auth";

interface FlashcardsPageProps {
  searchParams: Promise<{ view?: string; subjectId?: string }>;
}

export default async function FlashcardsPage({
  searchParams,
}: Readonly<FlashcardsPageProps>) {
  const session = await requireSession();
  const t = await getTranslations("FlashcardsPage");
  const { view, subjectId } = await searchParams;
  const currentView = resolveFlashcardsView(view);

  const [subjects, flashcards] = await Promise.all([
    getSubjectsForUser(session.user.id),
    getFlashcardsForUser(session.user.id),
  ]);

  const scopedSubjectId = subjects.some((subject) => subject.id === subjectId)
    ? subjectId
    : undefined;

  if (currentView === "review") {
    const reviewState = await getFlashcardReviewState({
      subjectId: scopedSubjectId,
      limit: 50,
    });

    return (
      <main>
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-10 flex min-w-0 items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers3 className="size-5" />
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

          <div className="mb-6">
            <FlashcardsViewSwitch
              currentView={currentView}
              manageLabel={t("manage")}
              reviewLabel={t("review")}
              subjectId={scopedSubjectId}
            />
          </div>

          <FlashcardReviewClient
            initialState={reviewState}
            subjectId={scopedSubjectId}
            embedded
          />
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers3 className="size-5" />
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

        <div className="mb-6">
          <FlashcardsViewSwitch
            currentView={currentView}
            manageLabel={t("manage")}
            reviewLabel={t("review")}
            subjectId={scopedSubjectId}
          />
        </div>

        <FlashcardsManager
          flashcards={flashcards}
          subjects={subjects}
          initialSubjectId={scopedSubjectId}
        />
      </div>
    </main>
  );
}
