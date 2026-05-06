import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubjectNotesListPage } from "@/components/notes/subject-notes-list-page";
import type { SubjectEntity } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/notes/note-sidebar", () => ({
  NoteSidebar: () => <aside data-testid="note-sidebar" />,
}));

function createSubject(): SubjectEntity {
  return {
    id: "subject-1",
    name: "Biology",
    totalClasses: null,
    maxMisses: null,
    archivedAt: null,
    userId: "user-1",
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  };
}

describe("SubjectNotesListPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("renders the notes sidebar and a center select-note indicator", async () => {
    await act(async () => {
      root.render(
        <SubjectNotesListPage subject={createSubject()} notes={[]} />,
      );
    });

    expect(
      container.querySelector('[data-testid="note-sidebar"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain("Select a note");
    expect(container.textContent).toContain(
      "Choose a note from the list to view and edit its content.",
    );
  });
});
