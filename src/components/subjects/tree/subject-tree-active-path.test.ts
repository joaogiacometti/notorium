import { describe, expect, it } from "vitest";
import {
  getActiveDocumentSubjectId,
  getActiveSubjectId,
} from "@/components/subjects/tree/subject-tree-active-path";

describe("getActiveSubjectId", () => {
  it("returns the subject id from a subject pathname", () => {
    expect(getActiveSubjectId("/subjects/s1")).toBe("s1");
    expect(getActiveSubjectId("/subjects/s1/documents/notes/n1")).toBe("s1");
  });

  it("returns undefined outside the subjects route", () => {
    expect(getActiveSubjectId("/subjects")).toBeUndefined();
  });
});

describe("getActiveDocumentSubjectId", () => {
  it("returns the subject id for note documents", () => {
    expect(getActiveDocumentSubjectId("/subjects/s1/documents/notes/n1")).toBe(
      "s1",
    );
  });

  it("returns the subject id for PDF documents", () => {
    expect(getActiveDocumentSubjectId("/subjects/s1/documents/pdfs/p1")).toBe(
      "s1",
    );
  });

  it("returns undefined when no document is open", () => {
    expect(getActiveDocumentSubjectId("/subjects/s1")).toBeUndefined();
    expect(
      getActiveDocumentSubjectId("/subjects/s1/documents/widgets/w1"),
    ).toBeUndefined();
  });
});
