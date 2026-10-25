import type { JSONContent } from "@tiptap/core";

export function trimDisplayParagraphs(document: JSONContent): JSONContent {
  const blocks = document.content ?? [];
  let end = blocks.length;
  while (end > 0 && isBlankDisplayParagraph(blocks[end - 1])) end -= 1;
  return { ...document, content: blocks.slice(0, end) };
}

function isBlankDisplayParagraph(block: JSONContent): boolean {
  if (block.type !== "paragraph") return false;
  return (block.content ?? []).every(
    (inline) =>
      inline.type === "hardBreak" ||
      (inline.type === "text" && (inline.text ?? "").trim() === ""),
  );
}
