"use client";

import { buildReviewContext } from "@/components/assistant/study-context-content";
import { useStudyContext } from "@/components/assistant/use-study-context";
import { FlashcardSourceReference } from "@/components/flashcards/shared/flashcard-source-reference";
import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import type { FlashcardReviewState } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

type ReviewCard = FlashcardReviewState["cards"][number];

interface ReviewSessionCardContentProps {
  card: ReviewCard;
  subjectLabel: string;
  revealed: boolean;
  mode?: "review" | "exam";
}

const reviewRichTextClassName =
  "flashcard-review-tiptap-content min-w-0 max-w-full wrap-break-word hyphens-auto";

// Kept short so rapid keyboard grading never waits on the animation.
const cardEnterClassName =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150";
const answerEnterClassName =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200";

/**
 * Renders the active flashcard content for review and exam sessions.
 *
 * @example
 * <ReviewSessionCardContent card={card} subjectLabel="Biology" revealed />
 */
export function ReviewSessionCardContent({
  card,
  subjectLabel,
  revealed,
  mode = "review",
}: Readonly<ReviewSessionCardContentProps>) {
  useStudyContext(buildReviewContext(card, subjectLabel, revealed, mode));
  // Keying by card id remounts the wrapper so the enter animation replays on
  // every new card instead of the content swapping in place.
  return (
    <div key={card.id} className={cardEnterClassName}>
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3 empty:hidden">
        {subjectLabel ? (
          <p className="truncate text-xs font-semibold tracking-wide text-primary/80 uppercase">
            {subjectLabel}
          </p>
        ) : null}
        {/* Hidden until reveal: the source title can give the answer away. */}
        {revealed ? (
          <FlashcardSourceReference
            source={card.source}
            newTab
            className="ml-auto max-w-[50%]"
          />
        ) : null}
      </div>
      <div className="relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
        <div className="flex flex-col">
          <CardFace title="Front" content={card.front} tone="front" />
          {revealed ? (
            <div className={answerEnterClassName}>
              <CardFace title="Answer" content={card.back} tone="back" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface CardFaceProps {
  title: string;
  content: string;
  tone: "front" | "back";
}

function CardFace({ title, content, tone }: Readonly<CardFaceProps>) {
  const isBack = tone === "back";
  const sectionClassName = isBack
    ? "flex flex-col border-t border-border/60 bg-primary/5 p-5 sm:p-6"
    : "flex flex-col p-5 sm:p-6";
  const titleClassName = cn(
    "mb-2 text-xs font-semibold tracking-wide uppercase",
    isBack ? "text-primary/80" : "text-muted-foreground",
  );
  const contentClassName = isBack
    ? `${reviewRichTextClassName} text-lg leading-relaxed text-foreground`
    : `${reviewRichTextClassName} text-lg leading-relaxed`;

  return (
    <div className={sectionClassName}>
      <h3 className={titleClassName}>{title}</h3>
      <div className="max-h-[44vh] overflow-y-auto pr-1 pb-1">
        <TiptapRenderer content={content} className={contentClassName} />
      </div>
    </div>
  );
}
