"use client";

export type NoteCopyFormat = "plain" | "rich";

/**
 * Copies note content to the clipboard in the requested format.
 *
 * @example
 * await copyNoteContentToClipboard("<p>Cell biology</p>", "rich");
 */
export async function copyNoteContentToClipboard(
  html: string,
  format: NoteCopyFormat,
) {
  const plainText = getPlainTextFromHtml(html);

  if (format === "plain" || !canCopyRichText()) {
    await navigator.clipboard.writeText(plainText);
    return;
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plainText], { type: "text/plain" }),
    }),
  ]);
}

function canCopyRichText() {
  return (
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function"
  );
}

function getPlainTextFromHtml(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(blockquote|div|h[1-6]|li|p|pre)>/gi, "\n");

  return (container.textContent ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
