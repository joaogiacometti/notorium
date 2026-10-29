import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentRowMenu } from "@/components/documents/document-row-menu";
import type { DocumentListItem } from "@/features/documents/types";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => children,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

describe("DocumentRowMenu", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("keeps note actions without generation", () => {
    const item: DocumentListItem = {
      id: "document-1",
      subjectId: "subject-1",
      title: "Cells",
      kind: "note",
      updatedAt: new Date(),
    };
    const copy = vi.fn();
    act(() =>
      root.render(
        <DocumentRowMenu
          item={item}
          onEditRequested={vi.fn()}
          onDeleteRequested={vi.fn()}
          onCopyRequested={copy}
        />,
      ),
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    const labels = buttons.map((button) => button.textContent?.trim());
    expect(labels).not.toContain("Generate flashcards");
    expect(labels).toEqual(expect.arrayContaining(["Rename", "Delete"]));
    act(() =>
      buttons
        .find((button) => button.textContent?.trim() === "Copy as plain text")
        ?.click(),
    );
    expect(labels).toContain("Copy as rich text");
    expect(copy).toHaveBeenCalledWith(item, "plain");
  });
});
