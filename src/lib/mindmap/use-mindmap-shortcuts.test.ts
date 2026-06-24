import { describe, expect, it } from "vitest";
import {
  isEditableTarget,
  isMindmapCopyChord,
  resolveMindmapKey,
} from "@/lib/mindmap/use-mindmap-shortcuts";

function copyEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    key: "c",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...overrides,
  } as KeyboardEvent;
}

describe("resolveMindmapKey", () => {
  it("maps V to select and H to hand", () => {
    expect(
      resolveMindmapKey(new KeyboardEvent("keydown", { key: "v" })),
    ).toEqual({ kind: "mode", mode: "select" });
    expect(
      resolveMindmapKey(new KeyboardEvent("keydown", { key: "H" })),
    ).toEqual({ kind: "mode", mode: "hand" });
  });

  it("maps canvas action keys", () => {
    expect(
      resolveMindmapKey(new KeyboardEvent("keydown", { key: " " })),
    ).toEqual({ kind: "space" });
    expect(
      resolveMindmapKey(new KeyboardEvent("keydown", { key: "Delete" })),
    ).toEqual({ kind: "delete" });
    expect(
      resolveMindmapKey(new KeyboardEvent("keydown", { key: "Tab" })),
    ).toEqual({ kind: "add-child" });
    expect(
      resolveMindmapKey(
        new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }),
      ),
    ).toEqual({ kind: "add-sibling" });
  });

  it("ignores plain Enter and modifier chords", () => {
    expect(
      resolveMindmapKey(new KeyboardEvent("keydown", { key: "Enter" })),
    ).toBeNull();
    expect(
      resolveMindmapKey(
        new KeyboardEvent("keydown", { key: "v", metaKey: true }),
      ),
    ).toBeNull();
  });
});

describe("isMindmapCopyChord", () => {
  it("accepts plain Ctrl/Cmd+C", () => {
    expect(isMindmapCopyChord(copyEvent({ ctrlKey: true }))).toBe(true);
    expect(isMindmapCopyChord(copyEvent({ metaKey: true }))).toBe(true);
    expect(isMindmapCopyChord(copyEvent({ key: "C", ctrlKey: true }))).toBe(
      true,
    );
  });

  it("rejects non-copy and modified copy chords", () => {
    expect(isMindmapCopyChord(copyEvent({}))).toBe(false);
    expect(isMindmapCopyChord(copyEvent({ key: "v", ctrlKey: true }))).toBe(
      false,
    );
    expect(isMindmapCopyChord(copyEvent({ ctrlKey: true, altKey: true }))).toBe(
      false,
    );
    expect(
      isMindmapCopyChord(copyEvent({ ctrlKey: true, shiftKey: true })),
    ).toBe(false);
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
