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
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
    push: pushMock,
  }),
}));

vi.mock("@/components/notes/delete-note-dialog", () => ({
  DeleteNoteDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="delete-note-dialog" /> : null,
}));

vi.mock("@/components/notes/edit-note-title-dialog", () => ({
  EditNoteTitleDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="edit-note-title-dialog" /> : null,
}));

vi.mock("@/components/notes/create-note-title-dialog", () => ({
  CreateNoteTitleDialog: ({
    trigger,
    open,
    onOpenChange,
    onSuccess,
  }: {
    trigger: React.ReactElement<Record<string, unknown>>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (noteId: string) => void;
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
        {open ? (
          <div data-testid="create-note-title-dialog">
            <button type="button" onClick={() => onSuccess("created-note")}>
              Create Note
            </button>
          </div>
        ) : null}
      </>
    );
  },
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    className,
  }: {
    children: React.ReactNode;
    onSelect?: (event: Event) => void;
    className?: string;
  }) => (
    <button
      className={className}
      type="button"
      onClick={() => onSelect?.(new Event("select"))}
    >
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactElement }) =>
    children,
}));

function createNote(id: string): NoteEntity {
  return {
    id,
    userId: "user-1",
    subjectId: "subject-1",
    title: `Note ${id}`,
    content: `<p>Body ${id}</p>`,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  };
}

function findButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  );
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

  it("opens title-only create and redirects to the created note", async () => {
    await act(async () => {
      root.render(
        <NotesList subjectId="subject-1" notes={[createNote("1")]} />,
      );
    });

    const button = findButton(container, "Create note");

    expect(button?.disabled).toBe(false);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector('[data-testid="create-note-title-dialog"]'),
    ).toBeTruthy();

    await act(async () => {
      findButton(container, "Create Note")?.click();
    });

    expect(pushMock).toHaveBeenCalledWith(
      "/subjects/subject-1/notes/created-note",
    );
  });

  it("renders a 3 note preview with content excerpts and a full list link", async () => {
    await act(async () => {
      root.render(
        <NotesList
          subjectId="subject-1"
          notes={["1", "2", "3", "4"].map(createNote)}
        />,
      );
    });

    expect(container.textContent).toContain("Note 1");
    expect(container.textContent).toContain("Body 1");
    expect(container.textContent).toContain("Note 3");
    expect(container.textContent).not.toContain("Note 4");

    const fullListLinks = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(
        'a[href="/subjects/subject-1/notes"]',
      ),
    );

    expect(fullListLinks.map((link) => link.textContent)).toEqual([
      "View all",
      "View all 4 notes",
    ]);
    expect(container.textContent).not.toContain("->");
  });

  it("keeps the create action contained in the mobile header layout", async () => {
    await act(async () => {
      root.render(<NotesList subjectId="subject-1" notes={[]} />);
    });

    const button = findButton(container, "Create note");

    expect(button?.className).toContain("w-full");
    expect(button?.className).toContain("whitespace-nowrap");
  });

  it("does not render the bottom full list link for 3 or fewer notes", async () => {
    await act(async () => {
      root.render(
        <NotesList
          subjectId="subject-1"
          notes={["1", "2", "3"].map(createNote)}
        />,
      );
    });

    expect(container.textContent).not.toContain("View all 3 notes");
  });

  it("opens edit and delete from the preview row action menu", async () => {
    await act(async () => {
      root.render(
        <NotesList subjectId="subject-1" notes={[createNote("1")]} />,
      );
    });

    await act(async () => {
      findButton(container, "Edit")?.click();
    });

    expect(
      container.querySelector('[data-testid="edit-note-title-dialog"]'),
    ).toBeTruthy();

    await act(async () => {
      findButton(container, "Delete")?.click();
    });

    expect(
      container.querySelector('[data-testid="delete-note-dialog"]'),
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

    const button = findButton(container, "Create note");
    const trigger = container.querySelector<HTMLElement>(
      '[data-testid="new-note-disabled-trigger"]',
    );

    expect(button?.disabled).toBe(true);
    expect(trigger).toBeTruthy();
    expect(trigger?.className).toContain("w-full");

    await act(async () => {
      trigger?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain(
      "Delete an existing note to create a new one.",
    );
  });
});
