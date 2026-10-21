import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardsRefineResults } from "@/components/flashcards/manage/flashcards-refine-results";
import type { StrugglingFlashcard } from "@/features/flashcards/refine/types";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const improveFlashcardBackMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/app/actions/flashcards", () => ({
  improveFlashcardBack: improveFlashcardBackMock,
  editFlashcard: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

vi.mock("@/components/flashcards/manage/improve-card-dialog", () => ({
  ImproveCardDialog: ({ proposedBack }: { proposedBack: string }) => (
    <div data-testid="improve-card-dialog">{proposedBack}</div>
  ),
}));

vi.mock("@/lib/server/server-action-errors", () => ({
  resolveActionErrorMessage: (result: { errorCode: string }) =>
    result.errorCode,
}));

function buildStrugglingCard(
  overrides: Partial<StrugglingFlashcard>,
): StrugglingFlashcard {
  return {
    id: "card-1",
    front: "What is a B-tree?",
    back: "A balanced tree.",
    subjectId: "deck-1",
    subjectName: "Databases",
    reviewCount: 12,
    lapseCount: 5,
    ...overrides,
  };
}

const cards = [
  buildStrugglingCard({ id: "struggling-1", front: "Struggling front" }),
];

function findButtonByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find(
    (currentButton) => currentButton.textContent?.includes(text),
  );
}

describe("FlashcardsRefineResults", () => {
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

  it("renders struggling rows with their lapse count and Improve action", async () => {
    await act(async () => {
      root.render(
        <FlashcardsRefineResults cards={cards} onRefineApplied={vi.fn()} />,
      );
    });

    expect(container.textContent).toContain("Struggling front");
    expect(container.textContent).toContain("Lapses");
    expect(container.textContent).toContain("5");
    expect(findButtonByText(container, "Improve")).toBeTruthy();
  });

  it("shows the empty message when there are no struggling cards", async () => {
    await act(async () => {
      root.render(
        <FlashcardsRefineResults cards={[]} onRefineApplied={vi.fn()} />,
      );
    });

    expect(container.textContent).toContain(
      "No struggling cards. Cards you keep forgetting show up here.",
    );
  });

  it("opens the improve dialog after generating a new back", async () => {
    improveFlashcardBackMock.mockResolvedValue({
      success: true,
      back: "Improved back",
    });

    await act(async () => {
      root.render(
        <FlashcardsRefineResults cards={cards} onRefineApplied={vi.fn()} />,
      );
    });

    await act(async () => {
      findButtonByText(container, "Improve")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(improveFlashcardBackMock).toHaveBeenCalledWith({
      subjectId: "deck-1",
      front: "Struggling front",
      currentBack: "A balanced tree.",
    });
    expect(
      container.querySelector('[data-testid="improve-card-dialog"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain("Improved back");
  });
});
