import { Extension } from "@tiptap/core";

/**
 * Maps slash command text to a recognised command name.
 * Returns null for any text that is not a known command.
 * @example resolveSlashCommand("/table") // → "table"
 */
export function resolveSlashCommand(text: string): "table" | "math" | null {
  const trimmed = text.trim();
  if (trimmed === "/table") return "table";
  if (trimmed === "/math") return "math";
  return null;
}

/** A document span (the "/math" paragraph) to be replaced by a block equation. */
export type SlashCommandRange = { from: number; to: number };

export interface SlashCommandsOptions {
  /**
   * Called when "/math" is confirmed, with the range of the "/math" paragraph.
   * The editor opens the LaTeX dialog and replaces this range on save, because
   * the math extension has no inline editor of its own.
   */
  onRequestBlockMath?: (range: SlashCommandRange) => void;
}

/**
 * Tiptap extension that intercepts the Enter key on slash-command lines.
 * Typing "/table" inserts a 3×3 table; "/math" opens the block-equation dialog
 * (inline math is typed directly as $...$ — see tiptap-math-extensions.ts).
 */
export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: "slashCommands",

  addOptions() {
    return { onRequestBlockMath: undefined };
  },

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

        const nodePos = $from.before();

        if (command === "table") {
          return editor
            .chain()
            .setNodeSelection(nodePos)
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        }

        if (command === "math") {
          const onRequestBlockMath = this.options.onRequestBlockMath;
          if (!onRequestBlockMath) return false;
          onRequestBlockMath({ from: nodePos, to: nodePos + node.nodeSize });
          return true;
        }

        return false;
      },
    };
  },
});
