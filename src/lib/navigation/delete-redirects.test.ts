import { describe, expect, it } from "vitest";
import type { DocumentListItem } from "@/features/documents/types";
import {
  getDocumentDeleteRedirectHref,
  getFolderDeleteRedirectHref,
} from "@/lib/navigation/delete-redirects";
import type { FolderTreeNode } from "@/lib/server/api-contracts";

const noteItem: DocumentListItem = {
  id: "note-1",
  title: "Note",
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  kind: "note",
  folderId: "folder-1",
};

const folderTree = [
  folderNode("parent", [folderNode("child")]),
  folderNode("sibling"),
];

describe("getDocumentDeleteRedirectHref", () => {
  it("returns home for the currently viewed document", () => {
    expect(
      getDocumentDeleteRedirectHref(
        "/folders/folder-1/documents/notes/note-1",
        noteItem,
      ),
    ).toBe("/");
  });

  it("returns null for another document", () => {
    expect(
      getDocumentDeleteRedirectHref(
        "/folders/folder-1/documents/notes/note-2",
        noteItem,
      ),
    ).toBeNull();
  });
});

describe("getFolderDeleteRedirectHref", () => {
  it("returns home for the current folder and descendants", () => {
    expect(
      getFolderDeleteRedirectHref("/folders/parent", folderTree, "parent"),
    ).toBe("/");
    expect(
      getFolderDeleteRedirectHref(
        "/folders/child/documents/notes/n1",
        folderTree,
        "parent",
      ),
    ).toBe("/");
  });

  it("returns null outside the deleted subtree", () => {
    expect(
      getFolderDeleteRedirectHref("/folders/sibling", folderTree, "parent"),
    ).toBeNull();
  });
});

function folderNode(
  id: string,
  children: FolderTreeNode[] = [],
): FolderTreeNode {
  return {
    id,
    userId: "user-1",
    name: id,
    parentFolderId: null,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    documentCount: 0,
    dueFlashcardCount: 0,
    children,
    path: id,
  };
}
