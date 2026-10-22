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
      <del className="mr-2 text-(--intent-danger-text)">{original}</del>
      <ins className="text-(--intent-success-text) no-underline">
        {replacement}
      </ins>
    </fieldset>
  );
}
