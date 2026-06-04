import type { Editor } from "@tiptap/react";
import { describe, expect, it, vi } from "vitest";
import { buildTableActions } from "@/components/shared/tiptap-table-controls";

function makeEditor() {
  const commands = {
    addRowBefore: vi.fn().mockReturnValue({ run: vi.fn() }),
    addRowAfter: vi.fn().mockReturnValue({ run: vi.fn() }),
    addColumnBefore: vi.fn().mockReturnValue({ run: vi.fn() }),
    addColumnAfter: vi.fn().mockReturnValue({ run: vi.fn() }),
    deleteRow: vi.fn().mockReturnValue({ run: vi.fn() }),
    deleteColumn: vi.fn().mockReturnValue({ run: vi.fn() }),
    deleteTable: vi.fn().mockReturnValue({ run: vi.fn() }),
  };

  const chainResult = {
    focus: () => chainResult,
    addRowBefore: () => ({ run: commands.addRowBefore }),
    addRowAfter: () => ({ run: commands.addRowAfter }),
    addColumnBefore: () => ({ run: commands.addColumnBefore }),
    addColumnAfter: () => ({ run: commands.addColumnAfter }),
    deleteRow: () => ({ run: commands.deleteRow }),
    deleteColumn: () => ({ run: commands.deleteColumn }),
    deleteTable: () => ({ run: commands.deleteTable }),
  };

  const editor = {
    chain: () => chainResult,
  } as unknown as Editor;

  return { editor, commands };
}

describe("buildTableActions", () => {
  it("returns 7 actions", () => {
    const { editor } = makeEditor();
    expect(buildTableActions(editor)).toHaveLength(7);
  });

  it("marks exactly the delete actions as destructive", () => {
    const { editor } = makeEditor();
    const actions = buildTableActions(editor);
    const destructive = actions.filter((a) => a.destructive);
    const labels = destructive.map((a) => a.label);
    expect(labels).toEqual(["Delete row", "Delete column", "Delete table"]);
  });

  it("insert actions are not destructive", () => {
    const { editor } = makeEditor();
    const actions = buildTableActions(editor);
    const insert = actions.filter((a) => !a.destructive);
    expect(insert).toHaveLength(4);
    expect(insert.every((a) => !a.destructive)).toBe(true);
  });

  it("each action has a label and icon", () => {
    const { editor } = makeEditor();
    for (const action of buildTableActions(editor)) {
      expect(action.label).toBeTruthy();
      expect(action.icon).toBeTruthy();
    }
  });

  it("calling each command invokes the correct chain method", () => {
    const { editor, commands } = makeEditor();
    const actions = buildTableActions(editor);

    const expectations: Array<[string, keyof typeof commands]> = [
      ["Add row above", "addRowBefore"],
      ["Add row below", "addRowAfter"],
      ["Add column left", "addColumnBefore"],
      ["Add column right", "addColumnAfter"],
      ["Delete row", "deleteRow"],
      ["Delete column", "deleteColumn"],
      ["Delete table", "deleteTable"],
    ];

    for (const [label, commandKey] of expectations) {
      const action = actions.find((a) => a.label === label);
      expect(action, `action "${label}" not found`).toBeDefined();
      action?.command();
      expect(commands[commandKey]).toHaveBeenCalled();
    }
  });
});
