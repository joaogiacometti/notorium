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
    expect(kinds).toContain("create-in-subject");
    expect(kinds).toContain("navigate");
    expect(kinds).toContain("theme");
    expect(kinds).toContain("open-settings");
    expect(kinds).toContain("shortcuts-help");
  });

  it("navigates Home to the root route", () => {
    const home = paletteCommands.find((command) => command.id === "goto-home");
    expect(home?.action).toEqual({ kind: "navigate", href: "/" });
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
