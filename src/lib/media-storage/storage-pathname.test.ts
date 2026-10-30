import { describe, expect, it } from "vitest";
import { parseOwnedAttachmentPathname } from "@/features/attachments/pathname";
import { buildMediaStoragePathname } from "@/lib/media-storage/storage-pathname";

describe("buildMediaStoragePathname", () => {
  it("builds an owner-scoped pathname the blob proxy accepts", () => {
    const pathname = buildMediaStoragePathname({
      userId: "user-1",
      context: "pdfs",
      fileName: "My Book (2nd ed).pdf",
      fallbackFileName: "document.pdf",
    });

    expect(pathname).toMatch(
      /^notorium\/pdfs\/user-1\/[0-9a-f-]{36}-My-Book--2nd-ed-\.pdf$/,
    );
    expect(parseOwnedAttachmentPathname(pathname)).toMatchObject({
      ownerId: "user-1",
      context: "pdfs",
    });
  });

  it("uses the fallback name when the original has no usable characters", () => {
    const pathname = buildMediaStoragePathname({
      userId: "user-1",
      context: "notes",
      fileName: "   ",
      fallbackFileName: "pasted-image",
    });

    expect(pathname.endsWith("-pasted-image")).toBe(true);
  });
});
