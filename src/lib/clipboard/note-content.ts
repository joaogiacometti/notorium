"use client";

import DOMPurify from "dompurify";

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
  const sanitizedHtml = sanitizeRichHtmlForClipboard(html);
  const plainText = getPlainTextFromHtml(sanitizedHtml);

  if (format === "plain" || !canCopyRichText()) {
    await navigator.clipboard.writeText(plainText);
    return;
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([sanitizedHtml], { type: "text/html" }),
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

function sanitizeRichHtmlForClipboard(html: string): string {
  const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
  const container = document.createElement("div");
  container.append(fragment);
  return container.innerHTML;
}

function getPlainTextFromHtml(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;

  // Math nodes serialize as empty elements with the LaTeX in data-latex, so
  // textContent would drop equations. Surface them as round-trippable $...$.
  replaceMathNodesWithLatex(container, "inline-math", "$");
  replaceMathNodesWithLatex(container, "block-math", "$$");

  container.querySelectorAll("br").forEach((br) => {
    br.replaceWith(document.createTextNode("\n"));
  });
  container
    .querySelectorAll("blockquote,div,h1,h2,h3,h4,h5,h6,li,p,pre")
    .forEach((el) => {
      el.after(document.createTextNode("\n"));
    });

  return (container.textContent ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function replaceMathNodesWithLatex(
  container: Element,
  dataType: "inline-math" | "block-math",
  delimiter: "$" | "$$",
) {
  container.querySelectorAll(`[data-type="${dataType}"]`).forEach((element) => {
    const latex = (element as HTMLElement).dataset.latex ?? "";
    element.replaceWith(
      document.createTextNode(`${delimiter}${latex}${delimiter}`),
    );
  });
}
