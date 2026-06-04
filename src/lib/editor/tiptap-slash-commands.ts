import { Extension } from "@tiptap/core";

/**
 * Maps slash command text to a recognised command name.
 * Returns null for any text that is not a known command.
 * @example resolveSlashCommand("/table") // → "table"
 */
export function resolveSlashCommand(text: string): "table" | null {
  if (text.trim() === "/table") return "table";
  return null;
}

/**
 * Tiptap extension that intercepts the Enter key on slash-command lines.
 * Typing "/table" on a paragraph line and pressing Enter inserts a 3×3 table.
 */
export const SlashCommands = Extension.create({
  name: "slashCommands",

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty) return false;
        const node = $from.node();
        if (node.type.name !== "paragraph") return false;
        // Only trigger when the cursor is at the very end of the line,
        // so mid-paragraph Enter (splitting) is never intercepted.
        if ($from.parentOffset !== node.content.size) return false;

        const command = resolveSlashCommand(node.textContent);
        if (!command) return false;

        if (command === "table") {
          const nodePos = $from.before();
          return editor
            .chain()
            .setNodeSelection(nodePos)
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        }

        return false;
      },
    };
  },
});
