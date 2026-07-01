import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import {
  isEditableTarget,
  isMindmapCopyChord,
  resolveMindmapKey,
  useMindmapShortcuts,
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

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

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

function MindmapShortcutHarness({
  enabled,
  onMode,
}: Readonly<{
  enabled: boolean;
  onMode: () => void;
}>) {
  useMindmapShortcuts({
    enabled,
    setMode: onMode,
    setSpaceHeld: () => {},
    deleteSelected: () => {},
    addChildToSelected: () => {},
    addSiblingToSelected: () => {},
    copySelected: () => false,
    undo: () => {},
    redo: () => {},
  });
  return null;
}

describe("useMindmapShortcuts", () => {
  it("does not handle keys while disabled", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onMode = vi.fn();
    document.body.appendChild(container);
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;

    try {
      await act(async () => {
        root.render(
          createElement(MindmapShortcutHarness, { enabled: false, onMode }),
        );
      });
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "v" }));
      expect(onMode).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      container.remove();
      (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT =
        false;
    }
  });
});
