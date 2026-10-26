"use client";

import { Lightbulb } from "lucide-react";
import { useEffect } from "react";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
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
export function ReviewSessionCardContent(
  props: Readonly<ReviewSessionCardContentProps>,
) {
  return <ReviewSessionCardAttempt key={props.card.id} {...props} />;
}

function ReviewSessionCardAttempt({
  card,
  subjectLabel,
  revealed,
  mode = "review",
}: Readonly<ReviewSessionCardContentProps>) {
  const context = buildReviewContext(card, subjectLabel, revealed, mode);
  useStudyContext(context);
  const workspace = useAssistantWorkspace();
  const clearAssistedRecall = workspace?.clearAssistedRecall;
  const assistedRecall = workspace?.assistedRecallFront === context.front;
  useEffect(() => {
    if (!revealed) clearAssistedRecall?.();
  }, [revealed, clearAssistedRecall]);
  return (
    <div className={cardEnterClassName}>
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
      <div className="relative flex flex-col overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col">
          <CardFace title="Front" content={card.front} tone="front" />
          {revealed ? (
            <div className={answerEnterClassName}>
              <CardFace title="Answer" content={card.back} tone="back" />
            </div>
          ) : null}
        </div>
      </div>
      {revealed && assistedRecall ? <AssistedRecallNote /> : null}
    </div>
  );
}

// Recall prompted by a hint is weaker than unaided recall, so grading it Good
// would schedule the card too far out. Advice only; the user still decides.
function AssistedRecallNote() {
  return (
    <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
      <Lightbulb className="size-4 shrink-0" />
      You asked the assistant before revealing. If it helped you recall, grade
      Hard or Again.
    </p>
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
    ? "flex flex-col border-t bg-muted/50 p-4 sm:p-6"
    : "flex flex-col p-4 sm:p-6";
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
