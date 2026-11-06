import type { AnyExtension } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { OrderedList } from "@tiptap/extension-list";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { tiptapLowlight } from "@/lib/editor/tiptap-lowlight";
import type { MathExtensionOptions } from "@/lib/editor/tiptap-math-extensions";
import { buildMathExtensions } from "@/lib/editor/tiptap-math-extensions";
import { NoteLink } from "@/lib/editor/tiptap-note-link";
import { buildTableExtensions } from "@/lib/editor/tiptap-table-extensions";

// Markdown ordered lists are numeric only, as in CommonMark. Tiptap's own
// tokenizer also reads letters and roman numerals, so prose like "A. Lincoln"
// or an answer like "B) $6$" would become a list. A no-op tokenizer falls
// back to the standard list tokens, whose items parse like bullet items. The
// schema is unchanged.
const CommonMarkOrderedList = OrderedList.extend({
  markdownTokenizer: {
    name: "orderedList",
    level: "block",
    start: () => -1,
    tokenize: () => undefined,
  },
  parseMarkdown: (token, helpers) => {
    if (token.type !== "list" || !token.ordered) return [];
    return {
      type: "orderedList",
      ...(token.start > 1 ? { attrs: { start: token.start } } : {}),
      content: helpers.parseChildren(token.items ?? []),
    };
  },
});

/** Shared supported document schema for editor, validation and rendering. */
export function buildDocumentExtensions(
  options: {
    editable?: boolean;
    math?: MathExtensionOptions;
    noteLink?: AnyExtension;
  } = {},
) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      orderedList: false,
      trailingNode: options.editable ? {} : false,
      link: {
        autolink: true,
        openOnClick: true,
        linkOnPaste: true,
        enableClickSelection: true,
      },
    }),
    CodeBlockLowlight.configure({
      defaultLanguage: "plaintext",
      enableTabIndentation: Boolean(options.editable),
      lowlight: tiptapLowlight,
    }),
    Highlight,
    Image.configure({
      allowBase64: false,
      resize: options.editable
        ? {
            enabled: true,
            directions: ["left", "right"],
            minWidth: 120,
            minHeight: 80,
            alwaysPreserveAspectRatio: true,
          }
        : false,
    }),
    CommonMarkOrderedList,
    TaskList,
    TaskItem.configure({ nested: true }),
    ...buildTableExtensions(),
    ...buildMathExtensions(options.math),
    options.noteLink ?? NoteLink,
  ];
}
