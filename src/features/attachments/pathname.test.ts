import { describe, expect, it } from "vitest";
import {
  getOwnedAttachmentPathnames,
  isOwnedAttachmentPathname,
  parseOwnedAttachmentPathname,
} from "@/features/attachments/pathname";

describe("parseOwnedAttachmentPathname", () => {
  it("parses a supported notes pathname", () => {
    expect(
      parseOwnedAttachmentPathname("notorium/notes/user-1/file.png"),
    ).toEqual({
      pathname: "notorium/notes/user-1/file.png",
      ownerId: "user-1",
      context: "notes",
      fileName: "file.png",
    });
  });

  it("rejects unsupported contexts", () => {
    expect(
      parseOwnedAttachmentPathname("notorium/other/user-1/file.png"),
    ).toBeNull();
  });

  it("rejects path traversal values", () => {
    expect(
      parseOwnedAttachmentPathname("notorium/notes/user-1/../file.png"),
    ).toBeNull();
  });
});

describe("isOwnedAttachmentPathname", () => {
  it("returns true for an owned pathname", () => {
    expect(
      isOwnedAttachmentPathname(
        "notorium/flashcards/user-1/file.png",
        "user-1",
      ),
    ).toBe(true);
  });

  it("returns false for a pathname owned by another user", () => {
    expect(
      isOwnedAttachmentPathname(
        "notorium/flashcards/user-2/file.png",
        "user-1",
      ),
    ).toBe(false);
  });
});

describe("getOwnedAttachmentPathnames", () => {
  it("returns unique owned pathnames only", () => {
    expect(
      getOwnedAttachmentPathnames(
        [
          "notorium/notes/user-1/a.png",
          "notorium/notes/user-1/a.png",
          "notorium/flashcards/user-2/b.png",
          "notorium/flashcards/user-1/c.png",
        ],
        "user-1",
      ),
    ).toEqual([
      "notorium/notes/user-1/a.png",
      "notorium/flashcards/user-1/c.png",
    ]);
  });
});
