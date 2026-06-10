import { describe, expect, it, vi } from "vitest";
import { shouldKeepMindmapEditorAfterBlur } from "@/lib/mindmap/edit-focus";

describe("shouldKeepMindmapEditorAfterBlur", () => {
  it("keeps editing when the document has lost focus", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    expect(shouldKeepMindmapEditorAfterBlur()).toBe(true);
  });

  it("ends editing when focus remains inside the document", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    expect(shouldKeepMindmapEditorAfterBlur()).toBe(false);
  });
});
