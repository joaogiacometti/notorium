import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardsRefineResults } from "@/components/flashcards/manage/flashcards-refine-results";
import type {
  RefineCardSummary,
  RefineGroups,
} from "@/features/flashcards/refine/types";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const proposeFlashcardMergeMock = vi.hoisted(() => vi.fn());
const generateFlashcardBackMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/app/actions/flashcards-refine", () => ({
  proposeFlashcardMerge: proposeFlashcardMergeMock,
  applyFlashcardMerge: vi.fn(),
}));

vi.mock("@/app/actions/flashcards", () => ({
  generateFlashcardBack: generateFlashcardBackMock,
  editFlashcard: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

vi.mock("@/components/flashcards/manage/merge-preview-dialog", () => ({
  MergePreviewDialog: ({ primaryFront }: { primaryFront: string }) => (
    <div data-testid="merge-preview-dialog">{primaryFront}</div>
  ),
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

function buildRefineCard(
  overrides: Partial<RefineCardSummary>,
): RefineCardSummary {
  return {
    id: "card-1",
    front: "What is a B-tree?",
    back: "A balanced tree.",
    subjectId: "deck-1",
    subjectName: "Databases",
    reviewCount: 5,
    lapseCount: 0,
    ...overrides,
  };
}

const groups: RefineGroups = {
  mastered: [buildRefineCard({ id: "mastered-1", front: "Mastered front" })],
  struggling: [
    buildRefineCard({
      id: "struggling-1",
      front: "Struggling front",
      reviewCount: 1,
    }),
  ],
};

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

  it("renders mastered and struggling rows with group badges and actions", async () => {
    await act(async () => {
      root.render(
        <FlashcardsRefineResults groups={groups} onRefineApplied={vi.fn()} />,
      );
    });

    expect(container.textContent).toContain("Mastered front");
    expect(container.textContent).toContain("Struggling front");
    expect(container.textContent).toContain("Mastered");
    expect(container.textContent).toContain("Struggling");
    expect(findButtonByText(container, "Level up")).toBeTruthy();
    expect(findButtonByText(container, "Improve")).toBeTruthy();
  });

  it("shows the empty message when there are no candidates", async () => {
    await act(async () => {
      root.render(
        <FlashcardsRefineResults
          groups={{ mastered: [], struggling: [] }}
          onRefineApplied={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain(
      "No mastered or struggling cards yet. Keep reviewing!",
    );
  });

  it("opens the merge preview dialog after a successful proposal", async () => {
    proposeFlashcardMergeMock.mockResolvedValue({
      success: true,
      proposal: {
        action: "relate",
        front: "New front",
        back: "New back",
        sourceFlashcardIds: ["other-1"],
        rationale: "Related concepts.",
      },
      sources: [buildRefineCard({ id: "other-1" })],
    });

    await act(async () => {
      root.render(
        <FlashcardsRefineResults groups={groups} onRefineApplied={vi.fn()} />,
      );
    });

    await act(async () => {
      findButtonByText(container, "Level up")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(proposeFlashcardMergeMock).toHaveBeenCalledWith({
      flashcardId: "mastered-1",
    });
    expect(
      container.querySelector('[data-testid="merge-preview-dialog"]'),
    ).toBeTruthy();
  });

  it("shows an info toast when the AI declines a merge", async () => {
    proposeFlashcardMergeMock.mockResolvedValue({
      success: false,
      errorCode: "flashcards.merge.declined",
    });

    await act(async () => {
      root.render(
        <FlashcardsRefineResults groups={groups} onRefineApplied={vi.fn()} />,
      );
    });

    await act(async () => {
      findButtonByText(container, "Level up")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(toastMock.info).toHaveBeenCalledOnce();
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-testid="merge-preview-dialog"]'),
    ).toBeNull();
  });

  it("opens the improve dialog after generating a new back", async () => {
    generateFlashcardBackMock.mockResolvedValue({
      success: true,
      back: "Improved back",
    });

    await act(async () => {
      root.render(
        <FlashcardsRefineResults groups={groups} onRefineApplied={vi.fn()} />,
      );
    });

    await act(async () => {
      findButtonByText(container, "Improve")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(generateFlashcardBackMock).toHaveBeenCalledWith({
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
