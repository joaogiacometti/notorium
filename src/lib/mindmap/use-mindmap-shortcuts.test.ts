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

type MindmapShortcutHarnessProps = Readonly<{
  enabled: boolean;
  onMode: () => void;
  onUndo?: () => void;
}>;

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
  onUndo = () => {},
}: MindmapShortcutHarnessProps) {
  useMindmapShortcuts({
    enabled,
    setMode: onMode,
    setSpaceHeld: () => {},
    deleteSelected: () => {},
    addChildToSelected: () => {},
    addSiblingToSelected: () => {},
    copySelected: () => false,
    undo: onUndo,
    redo: () => {},
  });
  return createElement("textarea", { "aria-label": "Node label" });
}

async function renderShortcutHarness(props: MindmapShortcutHarnessProps) {
  const container = document.createElement("div");
  const root = createRoot(container);
  document.body.appendChild(container);
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
  await act(async () => {
    root.render(createElement(MindmapShortcutHarness, props));
  });
  return { container, root };
}

async function cleanupShortcutHarness(
  rendered: Awaited<ReturnType<typeof renderShortcutHarness>>,
) {
  await act(async () => rendered.root.unmount());
  rendered.container.remove();
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
}

describe("useMindmapShortcuts", () => {
  it("does not handle keys while disabled", async () => {
    const onMode = vi.fn();
    const rendered = await renderShortcutHarness({
      enabled: false,
      onMode,
    });

    try {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "v" }));
      expect(onMode).not.toHaveBeenCalled();
    } finally {
      await cleanupShortcutHarness(rendered);
    }
  });

  it("lets editable fields handle their own undo", async () => {
    const onUndo = vi.fn();
    const rendered = await renderShortcutHarness({
      enabled: true,
      onMode: () => {},
      onUndo,
    });

    try {
      const textarea = rendered.container.querySelector("textarea");
      const event = new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      textarea?.dispatchEvent(event);

      expect(onUndo).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    } finally {
      await cleanupShortcutHarness(rendered);
    }
  });

  it("handles undo from the canvas", async () => {
    const onUndo = vi.fn();
    const rendered = await renderShortcutHarness({
      enabled: true,
      onMode: () => {},
      onUndo,
    });

    try {
      const event = new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
        cancelable: true,
      });
      window.dispatchEvent(event);

      expect(onUndo).toHaveBeenCalledOnce();
      expect(event.defaultPrevented).toBe(true);
    } finally {
      await cleanupShortcutHarness(rendered);
    }
  });
});
