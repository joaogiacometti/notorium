import {
  documentText,
  type RichTextDocument,
  richTextDocumentSchema,
} from "@/lib/editor/document";
import { getInternalAttachmentPathnames } from "@/lib/editor/document-content";
import { documentFromHtml, documentToHtml } from "@/lib/editor/document-html";
import { resolveEmbeddableImageUrl } from "@/lib/editor/tiptap-image-url";

const SUPPORTED_TAGS = new Set(
  "p br h1 h2 h3 strong b em i s strike del u mark a span div ul ol li pre code blockquote hr img table thead tbody tfoot tr th td colgroup col label input".split(
    " ",
  ),
);

/** Offline import only. Refuse conversions that discard text or semantic nodes. */
export function importLegacyDocument(html: string): RichTextDocument {
  const source = document.createElement("div");
  source.innerHTML = html;
  for (const element of source.querySelectorAll("*")) {
    if (!SUPPORTED_TAGS.has(element.tagName.toLowerCase()))
      throw new Error(`Unsupported legacy element: ${element.tagName}`);
  }
  convertStandaloneImageParagraphs(source);
  const result = richTextDocumentSchema.parse(
    documentFromHtml(source.innerHTML),
  );
  const rendered = document.createElement("div");
  rendered.innerHTML = documentToHtml(result);
  if (visibleText(source) !== visibleText(rendered))
    throw new Error("Legacy conversion would change visible text");
  for (const [selector, attributes] of [
    ["img", ["src", "alt", "title"]],
    ["a", ["href", "data-note-id"]],
    [
      '[data-type="inline-math"], [data-type="block-math"]',
      ["data-type", "data-latex"],
    ],
    ['li[data-type="taskItem"]', ["data-checked"]],
    ["td, th", ["colspan", "rowspan"]],
  ] as const) {
    const before = signatures(source, selector, attributes);
    const after = signatures(rendered, selector, attributes);
    if (JSON.stringify(before) !== JSON.stringify(after))
      throw new Error(
        `Legacy conversion would change ${selector} references or attributes`,
      );
  }
  // Compare formatted text, not tag counts: parsing may split or merge a mark's
  // tags without changing what it covers, but must not silently drop it.
  for (const selector of [
    "strong, b",
    "em, i",
    "s, strike, del",
    "u",
    "mark",
  ]) {
    if (formattedText(source, selector) !== formattedText(rendered, selector))
      throw new Error(`Legacy conversion would change ${selector} formatting`);
  }
  for (const selector of [
    "pre",
    "blockquote",
    "table",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "hr",
  ]) {
    if (
      source.querySelectorAll(selector).length !==
      rendered.querySelectorAll(selector).length
    )
      throw new Error(`Legacy conversion would change ${selector} structure`);
  }
  if (
    source.textContent?.trim() &&
    !documentText(result) &&
    !source.querySelector("img")
  )
    throw new Error("Legacy conversion produced an empty document");
  return result;
}

/**
 * The legacy renderer showed a paragraph holding only an image URL as that image,
 * and the blob sweep counted internal ones as references. Documents only know
 * image nodes, so these must become images or their blobs would look orphaned.
 */
function convertStandaloneImageParagraphs(root: HTMLElement): void {
  for (const paragraph of root.querySelectorAll("p")) {
    const src = standaloneImageSource(paragraph);
    if (!src) continue;
    const image = document.createElement("img");
    image.setAttribute("src", src);
    image.setAttribute("alt", "");
    paragraph.replaceWith(image);
  }
}

function standaloneImageSource(paragraph: Element): string | null {
  const text = (paragraph.textContent ?? "").trim();
  const [child, ...others] = paragraph.children;
  if (others.length > 0) return null;
  // A link with its own label is authored text, so it stays a link.
  if (
    child &&
    (child.tagName !== "A" || child.getAttribute("href")?.trim() !== text)
  )
    return null;
  return isInternalAttachmentSource(text)
    ? text
    : resolveEmbeddableImageUrl(text);
}

function isInternalAttachmentSource(src: string): boolean {
  return (
    getInternalAttachmentPathnames({
      version: 1,
      type: "doc",
      content: [{ type: "image", attrs: { src } }],
    }).length > 0
  );
}

/** Ignores whitespace, which the parser collapses around breaks and block edges. */
function visibleText(root: HTMLElement): string {
  return (root.textContent ?? "").replaceAll(/\s+/g, "");
}

function formattedText(root: HTMLElement, selector: string): string {
  return Array.from(
    root.querySelectorAll(selector),
    (element) => element.textContent,
  )
    .join("")
    .replaceAll(/\s+/g, "");
}

function signatures(
  root: HTMLElement,
  selector: string,
  attributes: readonly string[],
) {
  return Array.from(root.querySelectorAll(selector), (element) =>
    attributes.map((attribute) => {
      const value = element.getAttribute(attribute);
      return value ?? (["colspan", "rowspan"].includes(attribute) ? "1" : "");
    }),
  );
}
