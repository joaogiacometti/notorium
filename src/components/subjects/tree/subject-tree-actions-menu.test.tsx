import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubjectActionsMenu } from "@/components/subjects/tree/subject-tree-actions-menu";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({
    children,
    onCloseAutoFocus,
  }: {
    children: ReactNode;
    onCloseAutoFocus: (event: { preventDefault: () => void }) => void;
  }) => (
    <div>
      {children}
      <button
        type="button"
        onClick={() => onCloseAutoFocus({ preventDefault: vi.fn() })}
      >
        Finish menu close
      </button>
    </div>
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
  DropdownMenuSub: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuSubContent: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuSubTrigger: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

describe("SubjectActionsMenu", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("offers Add note under Documents and opens its creation flow", () => {
    const onCreateNote = vi.fn();
    const node = {
      id: "biology",
      name: "Biology",
      path: "Biology",
      dueFlashcardCount: 0,
    } as SubjectTreeNode;
    act(() =>
      root.render(
        <SubjectActionsMenu
          node={node}
          onCreateChild={vi.fn()}
          onCreateNote={onCreateNote}
          onCreatePdf={vi.fn()}
          onCreateFlashcard={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );

    const buttons = [...container.querySelectorAll("button")];
    const named = (label: string) =>
      buttons.find((button) => button.textContent?.trim() === label);
    expect(named("Subfolder")).toBeDefined();
    expect(named("Add note")).toBeDefined();
    expect(named("Document")).toBeUndefined();
    act(() => {
      named("Add note")?.click();
      named("Finish menu close")?.click();
    });
    expect(onCreateNote).toHaveBeenCalledWith("biology");
  });

  it("offers Add PDF under Documents and opens its upload flow", () => {
    const onCreatePdf = vi.fn();
    const node = {
      id: "biology",
      name: "Biology",
      path: "Biology",
      dueFlashcardCount: 0,
    } as SubjectTreeNode;
    act(() =>
      root.render(
        <SubjectActionsMenu
          node={node}
          onCreateChild={vi.fn()}
          onCreateNote={vi.fn()}
          onCreatePdf={onCreatePdf}
          onCreateFlashcard={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );

    const buttons = [...container.querySelectorAll("button")];
    const named = (label: string) =>
      buttons.find((button) => button.textContent?.trim() === label);
    act(() => {
      named("Add PDF")?.click();
      named("Finish menu close")?.click();
    });
    expect(onCreatePdf).toHaveBeenCalledWith("biology");
  });
});
