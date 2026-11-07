import { getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

interface DocumentTitleReviewProps {
  original: string;
  replacement: string;
}

/** Show a title replacement beside the document workspace's review controls.
 * @example <DocumentTitleReview original="Cells" replacement="Cell biology" />
 */
export function DocumentTitleReview({
  original,
  replacement,
}: Readonly<DocumentTitleReviewProps>) {
  return (
    <fieldset
      aria-label="Suggested title changes"
      className="min-w-0 flex-1 border-0 px-3 text-lg font-semibold tracking-tight"
    >
      <del className={cn("mr-2", getStatusToneClasses("danger").text)}>
        {original}
      </del>
      <ins className={cn("no-underline", getStatusToneClasses("success").text)}>
        {replacement}
      </ins>
    </fieldset>
  );
}
