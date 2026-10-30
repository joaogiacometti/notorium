import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { editFlashcard } from "@/app/actions/flashcards";
import { ReviewCardEditor } from "@/components/flashcards/review/review-card-editor";
import type { FlashcardReviewEntity } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/flashcards", () => ({
  editFlashcard: vi.fn(),
}));

vi.mock("@/components/shared/lazy-tiptap-editor", () => ({
  LazyTiptapEditor: ({ id }: { id?: string }) => <div data-testid={id} />,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function makeCard(): FlashcardReviewEntity {
  return {
    id: "card-1",
    front: "<p>Front</p>",
    back: "<p>Back</p>",
    state: "new",
    dueAt: new Date("2026-03-07T11:00:00.000Z"),
    stability: null,
    difficulty: null,
    intervalDays: 0,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    studyLaterAt: null,
    subjectId: "subject-1",
    userId: "user-1",
    createdAt: new Date("2026-03-07T11:00:00.000Z"),
    updatedAt: new Date("2026-03-07T11:00:00.000Z"),
  } as FlashcardReviewEntity;
}

function renderSession(content: ReactNode, footer: ReactNode) {
  return (
    <>
      {content}
      <footer>{footer}</footer>
    </>
  );
}

describe("ReviewCardEditor", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  async function render(onSaved = vi.fn(), onClose = vi.fn()) {
    await act(async () =>
      root.render(
        <ReviewCardEditor
          card={makeCard()}
          subjectLabel="Biology"
          aiEnabled={false}
          onSaved={onSaved}
          onClose={onClose}
          renderSession={renderSession}
        />,
      ),
    );
    return { onSaved, onClose };
  }

  function button(label: string): HTMLButtonElement {
    const match = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === label,
    );
    if (!match) throw new Error(`No button "${label}"`);
    return match;
  }

  it("edits both faces in place with Save and Cancel in the footer", async () => {
    await render();

    expect(container.querySelector('[data-testid$="-front"]')).not.toBeNull();
    expect(container.querySelector('[data-testid$="-back"]')).not.toBeNull();
    expect(container.querySelector("footer")?.textContent).toContain("Save");
    expect(container.querySelector("footer")?.textContent).toContain("Cancel");
  });

  it("saves the card, hands back the result, and closes", async () => {
    const saved = { ...makeCard(), back: "<p>New</p>" };
    vi.mocked(editFlashcard).mockResolvedValue({
      success: true,
      flashcard: saved,
    } as Awaited<ReturnType<typeof editFlashcard>>);
    const { onSaved, onClose } = await render();

    await act(async () => button("Save").click());

    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(editFlashcard).toHaveBeenCalledWith(
      expect.objectContaining({ id: "card-1", front: "<p>Front</p>" }),
    );
    expect(onSaved).toHaveBeenCalledWith(saved);
  });

  it("closes on Cancel without saving when nothing changed", async () => {
    const { onClose } = await render();

    await act(async () => button("Cancel").click());

    expect(onClose).toHaveBeenCalledOnce();
    expect(editFlashcard).not.toHaveBeenCalled();
  });
});
