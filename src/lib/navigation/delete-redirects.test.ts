import { describe, expect, it } from "vitest";
import type { DocumentListItem } from "@/features/documents/types";
import {
  getDocumentDeleteRedirectHref,
  getSubjectDeleteRedirectHref,
} from "@/lib/navigation/delete-redirects";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";

const noteItem: DocumentListItem = {
  id: "note-1",
  title: "Note",
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  kind: "note",
  subjectId: "subject-1",
};

const subjectTree = [
  subjectNode("parent", [subjectNode("child")]),
  subjectNode("sibling"),
];

describe("getDocumentDeleteRedirectHref", () => {
  it("returns home for the currently viewed document", () => {
    expect(
      getDocumentDeleteRedirectHref(
        "/subjects/subject-1/documents/notes/note-1",
        noteItem,
      ),
    ).toBe("/");
  });

  it("returns null for another document", () => {
    expect(
      getDocumentDeleteRedirectHref(
        "/subjects/subject-1/documents/notes/note-2",
        noteItem,
      ),
    ).toBeNull();
  });
});

describe("getSubjectDeleteRedirectHref", () => {
  it("returns home for the current subject and descendants", () => {
    expect(
      getSubjectDeleteRedirectHref("/subjects/parent", subjectTree, "parent"),
    ).toBe("/");
    expect(
      getSubjectDeleteRedirectHref(
        "/subjects/child/documents/notes/n1",
        subjectTree,
        "parent",
      ),
    ).toBe("/");
  });

  it("returns null outside the deleted subtree", () => {
    expect(
      getSubjectDeleteRedirectHref("/subjects/sibling", subjectTree, "parent"),
    ).toBeNull();
  });
});

function subjectNode(
  id: string,
  children: SubjectTreeNode[] = [],
): SubjectTreeNode {
  return {
    id,
    userId: "user-1",
    name: id,
    kind: "academic",
    parentSubjectId: null,
    totalClasses: null,
    maxMisses: null,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    documentCount: 0,
    dueFlashcardCount: 0,
    children,
    path: id,
  };
}
