import { describe, expect, it } from "vitest";
import { resolveSlashCommand } from "@/lib/editor/tiptap-slash-commands";

describe("resolveSlashCommand", () => {
  it("returns 'table' for '/table'", () => {
    expect(resolveSlashCommand("/table")).toBe("table");
  });

  it("returns 'math' for '/math'", () => {
    expect(resolveSlashCommand("/math")).toBe("math");
  });

  it("trims surrounding whitespace", () => {
    expect(resolveSlashCommand("  /table  ")).toBe("table");
    expect(resolveSlashCommand("  /math  ")).toBe("math");
  });

  it("returns null for unrecognised commands", () => {
    expect(resolveSlashCommand("/unknown")).toBeNull();
    expect(resolveSlashCommand("/tabl")).toBeNull();
    expect(resolveSlashCommand("/mat")).toBeNull();
  });

  it("returns null for empty text", () => {
    expect(resolveSlashCommand("")).toBeNull();
  });

  it("returns null for plain text without slash", () => {
    expect(resolveSlashCommand("table")).toBeNull();
  });
});
