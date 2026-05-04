import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoteDetail } from "@/components/notes/note-detail";
import type { DeckOption, NoteEntity } from "@/lib/server/api-contracts";

const { copyNoteContentMock, toastErrorMock, toastSuccessMock } = vi.hoisted(
  () => ({
    copyNoteContentMock: vi.fn(),
    toastErrorMock: vi.fn(),
    toastSuccessMock: vi.fn(),
  }),
);

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/notes/delete-note-dialog", () => ({
  DeleteNoteDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="delete-note-dialog" /> : null,
}));

vi.mock("@/components/notes/lazy-edit-note-dialog", () => ({
  LazyEditNoteDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="edit-note-dialog" /> : null,
}));

vi.mock("@/components/notes/generate-note-flashcards-dialog", () => ({
  GenerateNoteFlashcardsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="generate-note-flashcards-dialog" /> : null,
}));

vi.mock("@/components/shared/lazy-tiptap-renderer", () => ({
  LazyTiptapRenderer: ({ content }: { content: string }) => (
    <div>{content}</div>
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
  root.render(
    <NoteDetail
      aiEnabled
      backHref="/subjects/subject-1"
      backLabel="subject"
      decks={[deck]}
      note={note}
      {...props}
    />,
  );
}

function findButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  );
}

describe("NoteDetail", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    copyNoteContentMock.mockResolvedValue(undefined);
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

  it("hides the generate action when AI is disabled", async () => {
    await act(async () => {
      root.render(
        <NoteDetail
          aiEnabled={false}
          backHref="/subjects/subject-1"
          backLabel="subject"
          decks={[deck]}
          note={note}
        />,
      );
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

  it("renders copy options for notes with content", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    expect(
      container.querySelector('button[aria-label="Open note actions"]'),
    ).toBeTruthy();
    expect(findButton(container, "Copy as rich text")).toBeTruthy();
    expect(findButton(container, "Copy as plain text")).toBeTruthy();
  });

  it("hides copy options when note content is empty", async () => {
    await act(async () => {
      renderNoteDetail(root, { note: { ...note, content: " " } });
    });

    expect(
      container.querySelector('button[aria-label="Open note actions"]'),
    ).toBeTruthy();
    expect(findButton(container, "Copy as rich text")).toBeUndefined();
    expect(findButton(container, "Copy as plain text")).toBeUndefined();
    expect(findButton(container, "Edit")).toBeTruthy();
    expect(findButton(container, "Delete")).toBeTruthy();
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

  it("opens edit and delete dialogs from the note actions menu", async () => {
    await act(async () => {
      renderNoteDetail(root);
    });

    await act(async () => {
      findButton(container, "Edit")?.click();
    });

    expect(
      container.querySelector('[data-testid="edit-note-dialog"]'),
    ).toBeTruthy();

    await act(async () => {
      findButton(container, "Delete")?.click();
    });

    expect(
      container.querySelector('[data-testid="delete-note-dialog"]'),
    ).toBeTruthy();
  });
});
