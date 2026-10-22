import { ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { DOCUMENT_KIND_ICONS } from "@/components/documents/document-kind-icons";
import type { FlashcardSourceLink } from "@/features/flashcards/source-contract";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";
import { cn } from "@/lib/utils";

interface FlashcardSourceReferenceProps {
  source?: FlashcardSourceLink | null;
  newTab?: boolean;
  className?: string;
}

/** Return to a card's source. Provenance is metadata, so it always sits with
 * the card's header metadata: under the subject in detail, under the edit dialog
 * title, and on the subject row of revealed review/exam. Sessions and dialogs open a new tab to keep progress/drafts.
 * @example <FlashcardSourceReference source={card.source} />
 */
export function FlashcardSourceReference({
  source,
  newTab,
  className,
}: Readonly<FlashcardSourceReferenceProps>) {
  if (!source) return null;
  const KindIcon = DOCUMENT_KIND_ICONS[source.kind];
  const TrailingIcon = newTab ? ExternalLink : ArrowUpRight;
  return (
    <Link
      href={getDocumentDetailHref(source)}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      title={source.title}
      className={cn(
        "group inline-flex w-fit max-w-full min-w-0 items-center gap-1 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
      aria-label={`Source ${source.kind}: ${source.title}${newTab ? " (opens in a new tab)" : ""}`}
    >
      <KindIcon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="shrink-0">From</span>
      <span className="truncate font-medium text-foreground/80 underline-offset-2 group-hover:text-foreground group-hover:underline">
        {source.title}
      </span>
      <TrailingIcon
        className="size-3 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
    </Link>
  );
}
