import { describe, expect, it } from "vitest";
import {
  filterSearchCommands,
  parseSubjectIdFromPath,
  searchCommandGroupOrder,
  searchCommands,
} from "@/components/navbar/search-commands";

describe("searchCommands", () => {
  it("has unique ids", () => {
    const ids = searchCommands.map((command) => command.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every command keywords and a known group", () => {
    for (const command of searchCommands) {
      expect(command.keywords.length).toBeGreaterThan(0);
      expect(searchCommandGroupOrder).toContain(command.group);
    }
  });

  it("covers each create, navigate, theme, settings, and shortcuts action", () => {
    const kinds = new Set(searchCommands.map((command) => command.action.kind));
    expect(kinds).toContain("create");
    expect(kinds).toContain("navigate");
    expect(kinds).toContain("theme");
    expect(kinds).toContain("open-settings");
    expect(kinds).toContain("shortcuts-help");
  });

  it("navigates Home to the root route", () => {
    const home = searchCommands.find((command) => command.id === "goto-home");
    expect(home?.action).toEqual({ kind: "navigate", href: "/" });
  });
});

describe("filterSearchCommands", () => {
  it("returns every command for a blank query", () => {
    expect(filterSearchCommands("  ")).toEqual(searchCommands);
  });

  it("matches labels and keywords ignoring case", () => {
    expect(filterSearchCommands("THEME")).toHaveLength(3);
    expect(filterSearchCommands("Preferences").map((c) => c.id)).toEqual([
      "open-settings",
    ]);
  });

  it("returns nothing when no command matches", () => {
    expect(filterSearchCommands("zzzz")).toEqual([]);
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
    expect(parseSubjectIdFromPath("/")).toBeNull();
    expect(parseSubjectIdFromPath("/flashcards")).toBeNull();
  });
});
