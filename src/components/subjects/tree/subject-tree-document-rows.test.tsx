import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentRows } from "@/components/subjects/tree/subject-tree-document-rows";
import type { DocumentListItem } from "@/features/documents/types";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/documents/document-row-menu", () => ({
  DocumentRowMenu: () => null,
}));

let container: HTMLDivElement;
let root: Root;

function renderRows(
  documents: DocumentListItem[] | "loading" | "error",
  onRetry: () => void = () => {},
) {
  act(() => {
    root.render(
      <DocumentRows
        documents={documents}
        depth={1}
        activeHref="/"
        documentActions={{}}
        draggedDocumentId={null}
        pendingMoveId={null}
        onDocumentDragStart={() => {}}
        onDragEnd={() => {}}
        onRetry={onRetry}
      />,
    );
  });
}

describe("DocumentRows", () => {
  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("replaces the spinner with a retry when loading failed", () => {
    const onRetry = vi.fn();
    renderRows("error", onRetry);

    expect(container.textContent).not.toContain("Loading");
    const retry = container.querySelector("button");
    expect(retry?.textContent).toBe("Retry");

    act(() => retry?.click());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the loading row while documents are being fetched", () => {
    renderRows("loading");

    expect(container.textContent).toContain("Loading");
    expect(container.querySelector("button")).toBeNull();
  });
});
