import { gfm } from "@joplin/turndown-plugin-gfm";
import TurndownService from "turndown";
import { normalizeRichTextForStaticRendering } from "@/lib/editor/rich-text";

// Stored rich text is Tiptap HTML. AI chats and messengers render Markdown, so
// copy-for-sharing converts it with Turndown plus GFM (tables, strikethrough,
// task lists). The code below only covers what is specific to this app: how
// Tiptap stores math, task items, list paragraphs, and images.

let markdownConverter: TurndownService | null = null;

/**
 * Converts stored rich text (Tiptap HTML) to Markdown for pasting into an AI
 * chat or a message. Uploaded images become `[Image]` placeholders: their
 * URLs only open for the signed-in owner. Runs in the browser (DOMParser).
 *
 * @example
 * richTextToMarkdown("<p><strong>ATP</strong> stores energy</p>");
 * // "**ATP** stores energy"
 */
export function richTextToMarkdown(html: string): string {
  // Match what the card shows: the renderer turns image-URL paragraphs into
  // images and degrades unsupported image sources to text.
  const renderedHtml = normalizeRichTextForStaticRendering(html);
  // DOMParser builds an inert document: unlike innerHTML on a live element,
  // it neither runs scripts nor starts loading <img> sources.
  const body = new DOMParser().parseFromString(renderedHtml, "text/html").body;
  replaceMathWithLatex(body);
  unwrapTaskItemContent(body);
  unwrapSingleParagraphListItems(body);
  markdownConverter ??= createMarkdownConverter();
  return markdownConverter.turndown(body);
}

function createMarkdownConverter(): TurndownService {
  const converter = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  converter.use(gfm);
  // The output is read by people or an AI; escapes like `2 \* 3` only add noise.
  converter.escape = (text) => text;
  converter.addRule("image", { filter: "img", replacement: imageToMarkdown });
  return converter;
}

// Math nodes are empty elements holding their LaTeX in data-latex, which
// Turndown would drop as blank, so the LaTeX goes in as text first.
function replaceMathWithLatex(body: HTMLElement): void {
  const mathNodes = body.querySelectorAll(
    '[data-type="inline-math"], [data-type="block-math"]',
  );
  for (const mathNode of mathNodes) {
    const isBlock = mathNode.getAttribute("data-type") === "block-math";
    const delimiter = isBlock ? "$$" : "$";
    const latex = `${delimiter}${mathNode.getAttribute("data-latex") ?? ""}${delimiter}`;
    mathNode.replaceWith(isBlock ? createParagraph(body, latex) : latex);
  }
}

function createParagraph(body: HTMLElement, text: string): HTMLElement {
  const paragraph = body.ownerDocument.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}

// Tiptap task items hold their text in a <div> after the checkbox <label>;
// inlining it keeps the checkbox and the text on one line.
function unwrapTaskItemContent(body: HTMLElement): void {
  for (const content of body.querySelectorAll(
    'li[data-type="taskItem"] > div',
  )) {
    content.replaceWith(...content.childNodes);
  }
}

// Tiptap wraps every list item's text in <p>, which Turndown renders as a
// loose list with blank lines between items. Unwrapping single-paragraph items
// keeps lists tight; items with several paragraphs keep their blank lines.
function unwrapSingleParagraphListItems(body: HTMLElement): void {
  for (const item of body.querySelectorAll("li")) {
    const paragraphs = Array.from(item.children).filter(
      (child) => child.tagName === "P",
    );
    const [paragraph] = paragraphs;
    if (paragraph && paragraphs.length === 1) {
      paragraph.replaceWith(...paragraph.childNodes);
    }
  }
}

function imageToMarkdown(_content: string, image: HTMLElement): string {
  const src = image.getAttribute("src")?.trim() ?? "";
  const alt = image.getAttribute("alt")?.trim() ?? "";
  const markdown = /^https?:\/\//i.test(src) ? `![${alt}](${src})` : "[Image]";
  // Tiptap images are block nodes, so consecutive images keep their own lines.
  return image.parentNode?.nodeName === "BODY"
    ? `\n\n${markdown}\n\n`
    : markdown;
}
