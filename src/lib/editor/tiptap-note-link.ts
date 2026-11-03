import { mergeAttributes, Node } from "@tiptap/core";
import { getNoteLinkHref } from "@/lib/editor/note-links";

const NOTE_ID_ATTRIBUTE = "data-note-id";

/**
 * Inline link to another note. `label` is the title when the link was made;
 * editors show the current title, and this keeps stored HTML readable by every
 * plain-text path. Shared by the editor and review schemas, so keep it free of UI.
 */
export const NoteLink = Node.create({
  name: "noteLink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute(NOTE_ID_ATTRIBUTE),
        renderHTML: (attributes) => ({
          [NOTE_ID_ATTRIBUTE]: attributes.noteId,
        }),
      },
      label: {
        default: "",
        parseHTML: (element) => element.textContent ?? "",
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    // Above the Link mark's `a[href]` rule, which would flatten this to text.
    return [{ tag: `a[data-note-link][${NOTE_ID_ATTRIBUTE}]`, priority: 100 }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-note-link": "",
        href: getNoteLinkHref(node.attrs.noteId),
      }),
      node.attrs.label,
    ];
  },

  renderText({ node }) {
    return node.attrs.label;
  },
});
