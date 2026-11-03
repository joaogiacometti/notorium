import { Extension } from "@tiptap/core";
import { Suggestion, type SuggestionOptions } from "@tiptap/suggestion";

/** The note a picked `[[` suggestion links to. */
export interface NoteLinkChoice {
  noteId: string;
  label: string;
}

export type NoteLinkSuggestionRender = SuggestionOptions<
  NoteLinkChoice,
  NoteLinkChoice
>["render"];

/**
 * Typing `[[` starts a note search; picking a result replaces the typed text
 * with a note link. The UI is supplied through `render`.
 */
export const NoteLinkSuggestion = Extension.create<{
  render: NoteLinkSuggestionRender;
}>({
  name: "noteLinkSuggestion",
  // Above the editor's Enter handlers, so Enter picks while the list is open.
  priority: 200,

  addOptions() {
    return { render: undefined };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<NoteLinkChoice, NoteLinkChoice>({
        editor: this.editor,
        char: "[[",
        allowSpaces: true,
        allowedPrefixes: null,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: "noteLink", attrs: props },
              { type: "text", text: " " },
            ])
            .run();
        },
        render: this.options.render,
      }),
    ];
  },
});
