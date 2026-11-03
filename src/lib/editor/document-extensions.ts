import type { AnyExtension } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { tiptapLowlight } from "@/lib/editor/tiptap-lowlight";
import type { MathExtensionOptions } from "@/lib/editor/tiptap-math-extensions";
import { buildMathExtensions } from "@/lib/editor/tiptap-math-extensions";
import { NoteLink } from "@/lib/editor/tiptap-note-link";
import { buildTableExtensions } from "@/lib/editor/tiptap-table-extensions";

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
    TaskList,
    TaskItem.configure({ nested: true }),
    ...buildTableExtensions(),
    ...buildMathExtensions(options.math),
    options.noteLink ?? NoteLink,
  ];
}
