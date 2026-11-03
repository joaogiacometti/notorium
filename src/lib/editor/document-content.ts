import type { JSONContent } from "@tiptap/core";
import {
  documentNodes,
  documentText,
  type RichTextDocument,
} from "@/lib/editor/document";

export function documentUniquenessText(value: RichTextDocument): string {
  function text(node: JSONContent): string {
    if (node.type === "image") {
      const src = node.attrs?.src ?? "";
      let normalized = src;
      try {
        normalized = new URL(src).toString();
      } catch {}
      return ` image:${normalized} `;
    }
    if (node.type === "text") return node.text ?? "";
    if (node.type === "noteLink") return node.attrs?.label ?? "";
    if (node.type === "inlineMath" || node.type === "blockMath")
      return ` ${node.attrs?.latex ?? ""} `;
    return `${(node.content ?? []).map(text).join(node.type === "paragraph" ? "" : " ")} `;
  }
  return value.content
    .map(text)
    .join(" ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function attachmentPath(src: string): string | null {
  if (!src.startsWith("/") || src.startsWith("//")) return null;
  try {
    const url = new URL(src, "http://localhost");
    if (url.pathname !== "/api/attachments/blob") return null;
    return url.searchParams.get("pathname")?.trim() || null;
  } catch {
    return null;
  }
}

export function countInternalAttachmentImages(value: RichTextDocument): number {
  return documentNodes(value).filter(
    (node) => node.type === "image" && attachmentPath(node.attrs?.src ?? ""),
  ).length;
}

export function getInternalAttachmentPathnames(
  value: RichTextDocument,
): string[] {
  return [
    ...new Set(
      documentNodes(value).flatMap((node) => {
        const path =
          node.type === "image" ? attachmentPath(node.attrs?.src ?? "") : null;
        return path ? [path] : [];
      }),
    ),
  ];
}

export function documentExcerpt(
  value: RichTextDocument,
  maxLength: number,
): string {
  const text = documentText(value);
  return text.length <= maxLength
    ? text
    : `${text.slice(0, maxLength).trimEnd()}...`;
}
