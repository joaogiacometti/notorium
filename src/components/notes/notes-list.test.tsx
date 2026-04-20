import { act, cloneElement, isValidElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotesList } from "@/components/notes/notes-list";
import { LIMITS } from "@/lib/config/limits";
import type { NoteEntity } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/components/notes/note-card", () => ({
  NoteCard: ({ note }: { note: NoteEntity }) => <div>{note.title}</div>,
}));

vi.mock("@/components/notes/edit-note-dialog", () => ({
  EditNoteDialog: () => null,
}));

vi.mock("@/components/notes/delete-note-dialog", () => ({
  DeleteNoteDialog: () => null,
}));

vi.mock("@/components/notes/create-note-dialog", () => ({
  CreateNoteDialog: ({
    trigger,
    open,
    onOpenChange,
  }: {
    trigger: React.ReactElement<Record<string, unknown>>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => {
    const child = trigger.props.children;
    const disabled =
      trigger.props.disabled ||
      (isValidElement(child) &&
        Boolean((child.props as { disabled?: boolean }).disabled));

    return (
      <>
        {cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, {
          onClick: () => {
            if (!disabled) {
              onOpenChange(true);
            }
          },
        })}
        {open ? <div data-testid="create-note-dialog" /> : null}
      </>
    );
  },
}));

function createNote(id: string): NoteEntity {
  return {
    id,
    userId: "user-1",
    subjectId: "subject-1",
    title: `Note ${id}`,
    content: "<p>Body</p>",
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  };
}

function findButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  ) as HTMLButtonElement | undefined;
}

describe("NotesList", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("keeps the create action enabled below the per-subject limit", async () => {
    await act(async () => {
      root.render(
        <NotesList subjectId="subject-1" notes={[createNote("1")]} />,
      );
    });

    const button = findButton(container, "New Note");

    expect(button?.disabled).toBe(false);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector('[data-testid="create-note-dialog"]'),
    ).toBeTruthy();
  });

  it("shows a tooltip when the create action is disabled at the per-subject limit", async () => {
    await act(async () => {
      root.render(
        <NotesList
          subjectId="subject-1"
          notes={Array.from({ length: LIMITS.maxNotesPerSubject }, (_, index) =>
            createNote(`${index + 1}`),
          )}
        />,
      );
    });

    const button = findButton(container, "New Note");
    const trigger = container.querySelector<HTMLElement>(
      '[data-testid="new-note-disabled-trigger"]',
    );

    expect(button?.disabled).toBe(true);
    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain(
      "Delete an existing note to create a new one.",
    );
  });
});
