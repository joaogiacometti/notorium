import { describe, expect, it } from "vitest";
import {
  paletteCommands,
  paletteGroupOrder,
  parseSubjectIdFromPath,
} from "@/components/navbar/command-palette-commands";

describe("paletteCommands", () => {
  it("has unique ids", () => {
    const ids = paletteCommands.map((command) => command.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every command keywords and a known group", () => {
    for (const command of paletteCommands) {
      expect(command.keywords.length).toBeGreaterThan(0);
      expect(paletteGroupOrder).toContain(command.group);
    }
  });

  it("covers each create, navigate, theme, settings, and shortcuts action", () => {
    const kinds = new Set(
      paletteCommands.map((command) => command.action.kind),
    );
    expect(kinds).toContain("create");
    expect(kinds).toContain("navigate");
    expect(kinds).toContain("theme");
    expect(kinds).toContain("open-settings");
    expect(kinds).toContain("shortcuts-help");
    expect(kinds).toContain("open-window-create");
    expect(kinds).toContain("open-window-existing");
    expect(kinds).toContain("open-window-flashcard-edit");
  });

  it("navigates Home to the root route", () => {
    const home = paletteCommands.find((command) => command.id === "goto-home");
    expect(home?.action).toEqual({ kind: "navigate", href: "/" });
  });

  it("offers a windowed create for each editor kind", () => {
    const windowKinds = paletteCommands
      .filter((command) => command.action.kind === "open-window-create")
      .map((command) =>
        command.action.kind === "open-window-create"
          ? command.action.create
          : null,
      );
    expect(new Set(windowKinds)).toEqual(
      new Set(["mindmap", "note", "flashcard"]),
    );
  });

  it("orders the Windows group right after Create", () => {
    expect(paletteGroupOrder.indexOf("Windows")).toBe(
      paletteGroupOrder.indexOf("Create") + 1,
    );
  });

  it("offers flashcard editing as a window command", () => {
    const command = paletteCommands.find(
      (currentCommand) => currentCommand.id === "window-edit-flashcard",
    );

    expect(command?.action).toEqual({ kind: "open-window-flashcard-edit" });
  });
});

describe("parseSubjectIdFromPath", () => {
  it("extracts the subject id from a subject route", () => {
    expect(parseSubjectIdFromPath("/subjects/abc/documents/notes/n1")).toBe(
      "abc",
    );
    expect(parseSubjectIdFromPath("/subjects/abc")).toBe("abc");
  });

  it("returns null off subject routes", () => {
    expect(parseSubjectIdFromPath("/flashcards")).toBeNull();
    expect(parseSubjectIdFromPath("/planning")).toBeNull();
  });
});
