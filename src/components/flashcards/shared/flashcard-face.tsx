import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FlashcardSide = "front" | "back";

interface FlashcardFaceProps {
  side: FlashcardSide;
  /** Labels an editable face; read-only faces get a heading instead. */
  htmlFor?: string;
  children: ReactNode;
}

const faceLabels: Record<FlashcardSide, string> = {
  front: "Front",
  back: "Back",
};

/**
 * One side of a flashcard surface. Review, the detail page, and the create
 * dialog all stack Front over a tinted Back so a card looks the same whether it
 * is being read or edited.
 *
 * @example <FlashcardFace side="back"><TiptapRenderer content={back} /></FlashcardFace>
 */
export function FlashcardFace({
  side,
  htmlFor,
  children,
}: Readonly<FlashcardFaceProps>) {
  const labelClassName = cn(
    "text-xs font-medium tracking-wide uppercase",
    side === "back" ? "text-primary/80" : "text-muted-foreground",
  );

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-2 p-4 sm:p-6",
        side === "back" && "border-t bg-muted/50",
      )}
    >
      {htmlFor ? (
        <label htmlFor={htmlFor} className={cn(labelClassName, "w-fit")}>
          {faceLabels[side]}
        </label>
      ) : (
        <h3 className={labelClassName}>{faceLabels[side]}</h3>
      )}
      {children}
    </section>
  );
}
