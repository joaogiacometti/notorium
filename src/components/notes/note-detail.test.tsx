import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoteDetail } from "@/components/notes/note-detail";
import type { DeckOption, NoteEntity } from "@/lib/server/api-contracts";

const {
  copyNoteContentMock,
  createNoteMock,
  editNoteMock,
  pushMock,
  refreshMock,
  toastErrorMock,
  toastLoadingMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  copyNoteContentMock: vi.fn(),
  createNoteMock: vi.fn(),
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
  createNote: createNoteMock,
  editNote: editNoteMock,
}));

vi.mock("@/components/notes/delete-note-dialog", () => ({
  DeleteNoteDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="delete-note-dialog" /> : null,
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
    onClick,
  }: {
    children: ReactNode;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick}>
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

const otherNote: NoteEntity = {
  ...note,
  id: "note-2",
  title: "Cell respiration",
  content: "Mitochondria notes.",
  createdAt: new Date("2026-04-21T10:00:00.000Z"),
  updatedAt: new Date("2026-04-21T10:00:00.000Z"),
};

const deck: DeckOption = {
  id: "deck-1",
  userId: "user-1",
  parentDeckId: null,
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
        backHref="/subjects/subject-1"
        backLabel="Back to Subject"
        decks={[deck]}
        note={note}
        subjectNotes={[note, otherNote]}
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
    createNoteMock.mockResolvedValue({
      success: true,
      subjectId: "subject-1",
      noteId: "note-3",
    });
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

  it("renders same-subject notes with the active note highlighted", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    expect(container.textContent).toContain("Photosynthesis note");
    expect(container.textContent).toContain("Cell respiration");
    const activeNoteLink = container.querySelector('a[aria-current="page"]');

    expect(activeNoteLink?.textContent).toContain("Photosynthesis note");
    expect(activeNoteLink?.className).toContain("bg-muted/45");
    expect(activeNoteLink?.className).not.toContain("bg-accent");
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
    expect(getContentInput(container)?.value).toBe(note.content);
    expect(findButton(container, "Edit")).toBeUndefined();
  });

  it("does not show idle auto-save status", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    expect(container.textContent).not.toContain("Auto-save enabled");
  });

  it("creates a title-only note from the sidebar and redirects to it", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Create note"]')
        ?.click();
    });

    const titleInput = document.querySelector<HTMLInputElement>(
      "#form-create-note-title-input",
    );

    await act(async () => {
      changeFormControlValue(titleInput, "Lab review");
    });

    await act(async () => {
      document
        .querySelector<HTMLFormElement>("#form-create-note-title")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      await Promise.resolve();
    });

    expect(createNoteMock).toHaveBeenCalledWith({
      subjectId: "subject-1",
      title: "Lab review",
      content: "",
    });
    expect(pushMock).toHaveBeenCalledWith("/subjects/subject-1/notes/note-3");
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
    expect(toastLoadingMock).toHaveBeenCalledWith("Saving note...", {
      id: "note-save-status",
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Note saved.", {
      id: "note-save-status",
    });
  });

  it("flushes valid edits before sidebar navigation", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    await act(async () => {
      changeFormControlValue(getTitleInput(container), "Navigation save");
    });

    await act(async () => {
      container
        .querySelector<HTMLAnchorElement>(
          'a[href="/subjects/subject-1/notes/note-2"]',
        )
        ?.click();
      await Promise.resolve();
    });

    expect(editNoteMock).toHaveBeenCalledWith({
      id: note.id,
      title: "Navigation save",
      content: note.content,
    });
    expect(pushMock).toHaveBeenCalledWith("/subjects/subject-1/notes/note-2");
  });

  it("blocks sidebar navigation when inline edits are invalid", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    await act(async () => {
      changeFormControlValue(getTitleInput(container), "");
    });

    await act(async () => {
      container
        .querySelector<HTMLAnchorElement>(
          'a[href="/subjects/subject-1/notes/note-2"]',
        )
        ?.click();
      await Promise.resolve();
    });

    expect(editNoteMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("hides the generate action when AI is disabled", async () => {
    await act(async () => {
      renderNoteDetail(root, { aiEnabled: false });
    });

    expect(findButton(container, "Generate flashcards")).toBeUndefined();
  });

  it("disables the generate action when no decks exist", async () => {
    await act(async () => {
      renderNoteDetail(root, { decks: [] });
    });

    const button = findButton(container, "Generate flashcards");

    expect(button?.disabled).toBe(true);
    expect(button?.title).toBe("Create a deck before generating flashcards.");
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

    await act(async () => {
      findButton(container, "Delete")?.click();
    });

    expect(
      container.querySelector('[data-testid="delete-note-dialog"]'),
    ).toBeTruthy();
  });
});
