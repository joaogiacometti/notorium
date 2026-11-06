import { describe, expect, it } from "vitest";
import { resolveScopedFolderId } from "@/features/flashcards/scope";

const folders = [{ id: "folder-1" }, { id: "folder-2" }];

describe("resolveScopedFolderId", () => {
  it("keeps an id that belongs to the user's folders", () => {
    expect(resolveScopedFolderId(folders, "folder-2")).toBe("folder-2");
  });

  it("drops an unknown id", () => {
    expect(resolveScopedFolderId(folders, "other-user-folder")).toBe(undefined);
  });

  it("returns undefined when no id is given", () => {
    expect(resolveScopedFolderId(folders, undefined)).toBe(undefined);
  });
});
