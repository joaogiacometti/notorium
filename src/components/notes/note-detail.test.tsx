import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoteDetail } from "@/components/notes/note-detail";
import type { NoteEntity, SubjectOption } from "@/lib/server/api-contracts";

const {
  copyNoteContentMock,
  editNoteMock,
  pushMock,
  refreshMock,
  toastErrorMock,
  toastLoadingMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  copyNoteContentMock: vi.fn(),
  editNoteMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastLoadingMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/app/actions/notes", () => ({
  editNote: editNoteMock,
}));

vi.mock("@/components/notes/delete-note-dialog", () => ({
  DeleteNoteDialog: ({
    noteId,
    noteTitle,
    open,
  }: {
    noteId: string;
    noteTitle: string;
    open: boolean;
  }) =>
    open ? (
      <div data-note-id={noteId} data-testid="delete-note-dialog">
        {noteTitle}
      </div>
    ) : null,
}));

vi.mock("@/components/notes/generate-note-flashcards-dialog", () => ({
  GenerateNoteFlashcardsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="generate-note-flashcards-dialog" /> : null,
}));

vi.mock("@/components/shared/lazy-tiptap-editor", () => ({
  LazyTiptapEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="Note content"
      id="form-edit-note-content"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => children,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    disabled,
    onClick,
    onSelect,
    title,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    onSelect?: () => void;
    title?: string;
  }) => (
    <button
      type="button"
      onClick={onClick ?? onSelect}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/lib/clipboard/note-content", () => ({
  copyNoteContentToClipboard: copyNoteContentMock,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    loading: toastLoadingMock,
    success: toastSuccessMock,
  },
}));

const note: NoteEntity = {
  id: "note-1",
  userId: "user-1",
  subjectId: "subject-1",
  title: "Photosynthesis note",
  content: "<p>Chlorophyll captures light.</p>",
  createdAt: new Date("2026-04-20T10:00:00.000Z"),
  updatedAt: new Date("2026-04-20T10:00:00.000Z"),
};

const deck: SubjectOption = {
  id: "deck-1",
  userId: "user-1",
  parentSubjectId: null,
  kind: "general",
  totalClasses: null,
  maxMisses: null,
  name: "Biology",
  path: "Biology",
  createdAt: new Date("2026-04-20T10:00:00.000Z"),
  updatedAt: new Date("2026-04-20T10:00:00.000Z"),
};

function renderNoteDetail(
  root: Root,
  props: Partial<React.ComponentProps<typeof NoteDetail>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  root.render(
    <QueryClientProvider client={queryClient}>
      <NoteDetail
        aiEnabled
        subjects={[deck]}
        note={note}
        subjectName="Subject 1"
        subjectHref="/subjects/subject-1"
        {...props}
      />
    </QueryClientProvider>,
  );
}

function findButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  );
}

function findButtons(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).filter((button) =>
    button.textContent?.includes(text),
  );
}

function getTitleInput(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>("#form-edit-note-title");
}

function getContentInput(container: HTMLElement) {
  return container.querySelector<HTMLTextAreaElement>(
    "#form-edit-note-content",
  );
}

function changeFormControlValue(
  element: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
) {
  if (!element) {
    return;
  }

  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  valueSetter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

async function waitForAutosave() {
  await act(async () => {
    vi.advanceTimersByTime(850);
    await Promise.resolve();
  });
}

describe("NoteDetail", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    copyNoteContentMock.mockResolvedValue(undefined);
    editNoteMock.mockResolvedValue({ success: true, subjectId: "subject-1" });
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
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders editable title and content without an edit action", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    const titleInput = getTitleInput(container);

    expect(titleInput?.value).toBe(note.title);
    expect(titleInput?.getAttribute("aria-label")).toBe("Note title");
    expect(titleInput?.className).toContain("bg-transparent");
    expect(titleInput?.className).toContain("hover:bg-muted/25");
    expect(titleInput?.className).toContain("focus-visible:ring-2");
    expect(titleInput?.parentElement?.parentElement?.className).not.toContain(
      "overflow-hidden",
    );
    expect(
      titleInput?.parentElement?.parentElement?.parentElement?.className,
    ).not.toContain("overflow-hidden");
    expect(getContentInput(container)?.value).toBe(note.content);
    expect(
      container.querySelector('button[aria-label="Open note actions"]'),
    ).toBeTruthy();
  });

  it("keeps note actions beside the title on narrow layouts", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    const actionsButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open note actions"]',
    );

    expect(actionsButton?.parentElement?.className).toContain("shrink-0");
    expect(actionsButton?.parentElement?.className).not.toContain("w-full");
    expect(
      actionsButton?.closest("div.flex.items-start.justify-between"),
    ).toBeTruthy();
  });

  it("does not show idle auto-save status", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    expect(container.textContent).not.toContain("Auto-save enabled");
  });

  it("autosaves title and content edits", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    await act(async () => {
      changeFormControlValue(getTitleInput(container), "Updated note");
      changeFormControlValue(getContentInput(container), "Updated content");
    });

    await waitForAutosave();

    expect(editNoteMock).toHaveBeenCalledWith({
      id: note.id,
      title: "Updated note",
      content: "Updated content",
    });
    expect(toastLoadingMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it("keeps newer local content when saved note props refresh", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    await act(async () => {
      changeFormControlValue(getContentInput(container), "Saved echo");
    });

    await waitForAutosave();

    await act(async () => {
      changeFormControlValue(getContentInput(container), "Newer local draft");
    });

    const savedEchoNote = {
      ...note,
      content: "Saved echo",
      updatedAt: new Date("2026-04-20T10:01:00.000Z"),
    };

    await act(async () => {
      renderNoteDetail(root, {
        note: savedEchoNote,
      });
    });

    expect(getContentInput(container)?.value).toBe("Newer local draft");
  });

  it("hides the generate action when AI is disabled", async () => {
    await act(async () => {
      renderNoteDetail(root, { aiEnabled: false });
    });

    expect(findButton(container, "Generate flashcards")).toBeUndefined();
  });

  it("disables the generate action when no decks exist", async () => {
    await act(async () => {
      renderNoteDetail(root, { subjects: [] });
    });

    const button = findButton(container, "Generate flashcards");

    expect(button?.disabled).toBe(true);
    expect(button?.title).toBe(
      "Create a subject before generating flashcards.",
    );
  });

  it("opens the generate dialog", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    const button = findButton(container, "Generate flashcards");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector(
        '[data-testid="generate-note-flashcards-dialog"]',
      ),
    ).toBeTruthy();
  });

  it("copies note content as rich text", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    await act(async () => {
      findButton(container, "Copy as rich text")?.click();
    });

    expect(copyNoteContentMock).toHaveBeenCalledWith(note.content, "rich");
    expect(toastSuccessMock).toHaveBeenCalledWith("Note copied.");
  });

  it("copies note content as plain text", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    await act(async () => {
      findButton(container, "Copy as plain text")?.click();
    });

    expect(copyNoteContentMock).toHaveBeenCalledWith(note.content, "plain");
    expect(toastSuccessMock).toHaveBeenCalledWith("Note copied.");
  });

  it("shows an error toast when copying fails", async () => {
    copyNoteContentMock.mockRejectedValueOnce(new Error("copy failed"));

    await act(async () => {
      renderNoteDetail(root);
    });

    await act(async () => {
      findButton(container, "Copy as rich text")?.click();
    });

    expect(toastErrorMock).toHaveBeenCalledWith("Could not copy note.");
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it("opens the delete dialog from the note actions menu", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    const deleteButtons = Array.from(
      container.querySelectorAll("button"),
    ).filter((button) => button.textContent?.includes("Delete"));

    await act(async () => {
      deleteButtons.at(-1)?.click();
    });

    expect(
      container.querySelector('[data-testid="delete-note-dialog"]'),
    ).toBeTruthy();
  });

  it("enters zen mode, hiding the breadcrumb bar", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    expect(
      container.querySelector('nav[aria-label="Breadcrumb"]'),
    ).toBeTruthy();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Enter zen mode"]')
        ?.click();
    });

    expect(container.querySelector('nav[aria-label="Breadcrumb"]')).toBeFalsy();
    expect(
      container.querySelector('button[aria-label="Exit zen mode"]'),
    ).toBeTruthy();
    expect(getTitleInput(container)).toBeTruthy();
    expect(getContentInput(container)).toBeTruthy();
  });

  it("exits zen mode on Escape and restores the breadcrumb", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Enter zen mode"]')
        ?.click();
    });

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(
      container.querySelector('nav[aria-label="Breadcrumb"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('button[aria-label="Enter zen mode"]'),
    ).toBeTruthy();
  });

  it("focuses the inline title from the header edit action", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    await act(async () => {
      findButtons(container, "Edit").at(-1)?.click();
    });

    expect(document.activeElement).toBe(getTitleInput(container));
  });
});
