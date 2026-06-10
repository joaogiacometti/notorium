import { describe, expect, it } from "vitest";
import {
  isEditableTarget,
  resolveModeKey,
} from "@/lib/mindmap/use-mindmap-mode-keys";

describe("resolveModeKey", () => {
  it("maps V to select and H to hand (case-insensitive)", () => {
    expect(resolveModeKey(new KeyboardEvent("keydown", { key: "v" }))).toEqual({
      kind: "mode",
      mode: "select",
    });
    expect(resolveModeKey(new KeyboardEvent("keydown", { key: "H" }))).toEqual({
      kind: "mode",
      mode: "hand",
    });
  });

  it("maps Space to a temporary-hand action", () => {
    expect(resolveModeKey(new KeyboardEvent("keydown", { key: " " }))).toEqual({
      kind: "space",
    });
  });

  it("maps Delete and Backspace to a delete action", () => {
    expect(
      resolveModeKey(new KeyboardEvent("keydown", { key: "Delete" })),
    ).toEqual({ kind: "delete" });
    expect(
      resolveModeKey(new KeyboardEvent("keydown", { key: "Backspace" })),
    ).toEqual({ kind: "delete" });
  });

  it("maps Tab to an add-child action", () => {
    expect(
      resolveModeKey(new KeyboardEvent("keydown", { key: "Tab" })),
    ).toEqual({ kind: "add-child" });
  });

  it("ignores tool keys held with a modifier so shortcuts like Cmd+V pass through", () => {
    expect(
      resolveModeKey(new KeyboardEvent("keydown", { key: "v", metaKey: true })),
    ).toBeNull();
    expect(
      resolveModeKey(new KeyboardEvent("keydown", { key: "z" })),
    ).toBeNull();
  });
});

describe("isEditableTarget", () => {
  it("treats inputs, textareas, and contenteditable as editable", () => {
    expect(isEditableTarget(document.createElement("input"))).toBe(true);
    expect(isEditableTarget(document.createElement("textarea"))).toBe(true);
    const editable = document.createElement("div");
    editable.contentEditable = "true";
    expect(isEditableTarget(editable)).toBe(true);
  });

  it("treats plain elements and null as not editable", () => {
    expect(isEditableTarget(document.createElement("div"))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
