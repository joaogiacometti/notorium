import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoteDetail } from "@/components/notes/note-detail";
import type { DeckOption, NoteEntity } from "@/lib/server/api-contracts";

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
  DeleteNoteDialog: () => null,
}));

vi.mock("@/components/notes/lazy-edit-note-dialog", () => ({
  LazyEditNoteDialog: () => null,
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
  ) as HTMLButtonElement | undefined;
}

describe("NoteDetail", () => {
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
});
