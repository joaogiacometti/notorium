"use client";

import { Lightbulb } from "lucide-react";
import { type RefObject, useEffect, useRef } from "react";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { buildReviewContext } from "@/components/assistant/study-context-content";
import { useStudyContext } from "@/components/assistant/use-study-context";
import {
  FlashcardFace,
  type FlashcardSide,
} from "@/components/flashcards/shared/flashcard-face";
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
  const cardRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  // Anki's answer scrolling: a new card starts at its top, and revealing a long
  // card brings the start of the Back to the top instead of leaving it below
  // the fold. Cards that fit the session area do not scroll at all.
  useEffect(() => {
    if (!revealed) cardRef.current?.scrollIntoView?.({ block: "start" });
  }, [revealed]);
  useAnswerScrollAnchor(answerRef, revealed);
  return (
    <div ref={cardRef} className={cn("scroll-mt-4", cardEnterClassName)}>
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
          <CardFace side="front" content={card.front} />
          {revealed ? (
            <div
              ref={answerRef}
              className={cn("scroll-mt-4", answerEnterClassName)}
            >
              <CardFace side="back" content={card.back} />
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
  side: FlashcardSide;
  content: string;
}

function CardFace({ side, content }: Readonly<CardFaceProps>) {
  return (
    // No scroller of its own: the session's card area is the one scroll region.
    <FlashcardFace side={side}>
      <TiptapRenderer
        content={content}
        className={`${reviewRichTextClassName} text-lg leading-relaxed`}
      />
    </FlashcardFace>
  );
}

// The renderer fills the Back asynchronously, so a single scroll on reveal
// lands while the answer is still short. Re-anchor whenever it resizes until it
// settles, and never fight a scroll the user starts.
const ANSWER_SETTLE_MS = 1000;
const userScrollEvents = ["wheel", "touchstart", "keydown"] as const;

function useAnswerScrollAnchor(
  answerRef: RefObject<HTMLDivElement | null>,
  revealed: boolean,
) {
  useEffect(() => {
    const answer = answerRef.current;
    if (!revealed || !answer) return;
    const anchor = () => answer.scrollIntoView?.({ block: "start" });
    anchor();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(anchor);
    observer.observe(answer);
    const stop = () => observer.disconnect();
    const timer = window.setTimeout(stop, ANSWER_SETTLE_MS);
    for (const type of userScrollEvents) {
      window.addEventListener(type, stop, { passive: true });
    }
    return () => {
      stop();
      window.clearTimeout(timer);
      for (const type of userScrollEvents) {
        window.removeEventListener(type, stop);
      }
    };
  }, [answerRef, revealed]);
}
