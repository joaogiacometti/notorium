import { act, cloneElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoteSidebar } from "@/components/notes/note-sidebar";
import { LIMITS } from "@/lib/config/limits";
import type { NoteEntity } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/components/notes/create-note-title-dialog", () => ({
  CreateNoteTitleDialog: ({
    trigger,
    onOpenChange,
    onSuccess,
  }: {
    trigger: React.ReactElement<{ disabled?: boolean; onClick?: () => void }>;
    onOpenChange: (open: boolean) => void;
    onSuccess: (noteId: string) => void;
  }) =>
    cloneElement(trigger, {
      onClick: () => {
        if (trigger.props.disabled) {
          return;
        }
        onOpenChange(true);
        onSuccess("created-note");
      },
    }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) =>
    children,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick: () => void;
  }) => (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
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

describe("NoteSidebar", () => {
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

  it("renders a mobile-friendly create action in the notes header", async () => {
    await act(async () => {
      root.render(
        <NoteSidebar subjectId="subject-1" notes={[createNote("1")]} />,
      );
    });

    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Create note"]',
    );

    expect(button?.textContent).toContain("Create note");
    expect(button?.className).toContain("whitespace-nowrap");
    expect(button?.className).not.toContain("sm:sr-only");
    expect(button?.className).not.toContain("sm:size-8");

    await act(async () => {
      button?.click();
    });

    expect(pushMock).toHaveBeenCalledWith(
      "/subjects/subject-1/notes/created-note",
    );
  });

  it("keeps the create action disabled at the per-subject limit", async () => {
    await act(async () => {
      root.render(
        <NoteSidebar
          subjectId="subject-1"
          notes={Array.from({ length: LIMITS.maxNotesPerSubject }, (_, index) =>
            createNote(`${index + 1}`),
          )}
        />,
      );
    });

    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Create note"]',
    );

    expect(button?.disabled).toBe(true);
    expect(button?.title).toBe("Delete an existing note to create a new one.");
  });

  it("runs sidebar row edit and delete actions for notes", async () => {
    const onEditRequested = vi.fn();
    const onDeleteRequested = vi.fn();
    const firstNote = createNote("1");
    const secondNote = createNote("2");

    await act(async () => {
      root.render(
        <NoteSidebar
          activeNoteId="1"
          subjectId="subject-1"
          notes={[firstNote, secondNote]}
          onEditRequested={onEditRequested}
          onDeleteRequested={onDeleteRequested}
        />,
      );
    });

    const actionTrigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open actions for Note 2"]',
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    const editButtons = buttons.filter((button) =>
      button.textContent?.includes("Edit"),
    );
    const deleteButtons = buttons.filter((button) =>
      button.textContent?.includes("Delete"),
    );

    expect(actionTrigger).toBeTruthy();
    expect(
      container.querySelector('button[aria-label="Open actions for Note 1"]'),
    ).toBeTruthy();

    await act(async () => {
      editButtons.at(1)?.click();
      deleteButtons.at(1)?.click();
    });

    expect(onEditRequested).toHaveBeenCalledWith(secondNote);
    expect(onDeleteRequested).toHaveBeenCalledWith(secondNote);
  });
});
