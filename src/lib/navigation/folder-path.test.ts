import { describe, expect, it } from "vitest";
import {
  getDocumentFolderIdFromPathname,
  getFolderIdFromPathname,
} from "@/lib/navigation/folder-path";

describe("getFolderIdFromPathname", () => {
  it("returns the folder id from a folder pathname", () => {
    expect(getFolderIdFromPathname("/folders/s1")).toBe("s1");
    expect(getFolderIdFromPathname("/folders/s1/documents/notes/n1")).toBe(
      "s1",
    );
  });

  it("returns undefined outside the folders route", () => {
    expect(getFolderIdFromPathname("/folders")).toBeUndefined();
  });
});

describe("getDocumentFolderIdFromPathname", () => {
  it("returns the folder id for note documents", () => {
    expect(
      getDocumentFolderIdFromPathname("/folders/s1/documents/notes/n1"),
    ).toBe("s1");
  });

  it("returns the folder id for PDF documents", () => {
    expect(
      getDocumentFolderIdFromPathname("/folders/s1/documents/pdfs/p1"),
    ).toBe("s1");
  });

  it("returns undefined when no document is open", () => {
    expect(
      getDocumentFolderIdFromPathname("/folders/s1/documents/notes"),
    ).toBeUndefined();
    expect(getDocumentFolderIdFromPathname("/folders/s1")).toBeUndefined();
    expect(
      getDocumentFolderIdFromPathname("/folders/s1/documents/widgets/w1"),
    ).toBeUndefined();
  });
});
