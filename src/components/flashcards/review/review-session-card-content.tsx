"use client";

import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import type { FlashcardReviewState } from "@/lib/server/api-contracts";

type ReviewCard = FlashcardReviewState["cards"][number];

interface ReviewSessionCardContentProps {
  card: ReviewCard;
  deckLabel: string;
  revealed: boolean;
}

const reviewRichTextClassName =
  "flashcard-review-tiptap-content min-w-0 max-w-full wrap-break-word hyphens-auto";

/**
 * Renders the active flashcard content for review and exam sessions.
 *
 * @example
 * <ReviewSessionCardContent card={card} deckLabel="Biology" revealed />
 */
export function ReviewSessionCardContent({
  card,
  deckLabel,
  revealed,
}: Readonly<ReviewSessionCardContentProps>) {
  return (
    <>
      {deckLabel ? (
        <p className="mb-3 truncate text-xs font-semibold tracking-wider text-primary/80 uppercase">
          {deckLabel}
        </p>
      ) : null}
      <div className="relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
        <div className="flex flex-col">
          <CardFace title="Front" content={card.front} tone="front" />
          {revealed ? (
            <CardFace title="Answer" content={card.back} tone="back" />
          ) : null}
        </div>
      </div>
    </>
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
  const titleClassName = isBack
    ? "mb-2 text-xs font-semibold tracking-wider text-primary/80 uppercase"
    : "mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase";
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
