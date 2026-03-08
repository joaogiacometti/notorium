import { describe, expect, it } from "vitest";
import { shouldSubmitEditorOnCtrlEnter } from "@/lib/editor-submit-shortcuts";

describe("shouldSubmitEditorOnCtrlEnter", () => {
  it("submits on exact Ctrl+Enter", () => {
    expect(
      shouldSubmitEditorOnCtrlEnter({
        key: "Enter",
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(true);
  });

  it("ignores plain Enter", () => {
    expect(
      shouldSubmitEditorOnCtrlEnter({
        key: "Enter",
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(false);
  });

  it("ignores other keys even with Ctrl", () => {
    expect(
      shouldSubmitEditorOnCtrlEnter({
        key: "s",
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(false);
  });

  it("ignores additional modifiers", () => {
    expect(
      shouldSubmitEditorOnCtrlEnter({
        key: "Enter",
        ctrlKey: true,
        altKey: true,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(false);
    expect(
      shouldSubmitEditorOnCtrlEnter({
        key: "Enter",
        ctrlKey: true,
        altKey: false,
        metaKey: true,
        shiftKey: false,
      }),
    ).toBe(false);
    expect(
      shouldSubmitEditorOnCtrlEnter({
        key: "Enter",
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        shiftKey: true,
      }),
    ).toBe(false);
  });
});
