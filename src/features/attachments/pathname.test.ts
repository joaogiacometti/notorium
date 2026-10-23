import { describe, expect, it } from "vitest";
import { parseOwnedAttachmentPathname } from "@/features/attachments/pathname";

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
