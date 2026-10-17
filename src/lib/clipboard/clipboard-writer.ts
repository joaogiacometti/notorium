/**
 * Whether the browser can write typed clipboard items (rich HTML, or content
 * that is still loading) instead of only `writeText`.
 *
 * @example
 * if (canWriteClipboardItems()) await navigator.clipboard.write([item]);
 */
export function canWriteClipboardItems(): boolean {
  return (
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function"
  );
}

/**
 * Writes text that is still being prepared (for example after a fetch) to the
 * clipboard. Safari rejects clipboard writes that start after an `await`, so
 * the write starts immediately with a `ClipboardItem`, which accepts a promise
 * for its content; browsers without it wait for the text and use `writeText`.
 *
 * @example
 * await writePendingTextToClipboard(fetchCards().then(formatCards));
 */
export async function writePendingTextToClipboard(
  text: Promise<string>,
): Promise<void> {
  if (!canWriteClipboardItems()) {
    await navigator.clipboard.writeText(await text);
    return;
  }

  const blob = text.then((value) => new Blob([value], { type: "text/plain" }));
  await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
}
