import { describe, expect, it } from "vitest";
import { isCopyChord } from "@/lib/mindmap/use-mindmap-copy-key";

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

describe("isCopyChord", () => {
  it("accepts Ctrl+C", () => {
    expect(isCopyChord(copyEvent({ ctrlKey: true }))).toBe(true);
  });

  it("accepts Cmd+C", () => {
    expect(isCopyChord(copyEvent({ metaKey: true }))).toBe(true);
  });

  it("accepts uppercase C (caps lock or shift-mapped key value)", () => {
    expect(isCopyChord(copyEvent({ key: "C", ctrlKey: true }))).toBe(true);
  });

  it("rejects C without a Ctrl/Cmd modifier", () => {
    expect(isCopyChord(copyEvent({}))).toBe(false);
  });

  it("rejects other keys with Ctrl held", () => {
    expect(isCopyChord(copyEvent({ key: "v", ctrlKey: true }))).toBe(false);
  });

  it("rejects when Alt or Shift is also held", () => {
    expect(isCopyChord(copyEvent({ ctrlKey: true, altKey: true }))).toBe(false);
    expect(isCopyChord(copyEvent({ ctrlKey: true, shiftKey: true }))).toBe(
      false,
    );
  });
});
