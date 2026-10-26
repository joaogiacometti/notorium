import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardsManagerToolbar } from "@/components/flashcards/manage/flashcards-manager-toolbar";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const baseProps = {
  searchQuery: "",
  onSearchQueryChange: vi.fn(),
  isManageScopeLoading: false,
  hasManageScopeError: false,
  selectedFlashcardIds: [],
  total: 0,
  refineMode: false,
  strugglingCount: 0,
  isLoadingStrugglingCards: false,
  aiEnabled: false,
  isCopyingSelection: false,
  onCopySelection: vi.fn(),
  onOpenCreateDialog: vi.fn(),
  onStartRefine: vi.fn(),
  onRefreshRefine: vi.fn(),
  onExitRefine: vi.fn(),
  onOpenBulkMoveDialog: vi.fn(),
  onOpenBulkDeleteDialog: vi.fn(),
  onOpenBulkResetDialog: vi.fn(),
  onClearSelection: vi.fn(),
};

function findButtonByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find(
    (currentButton) => currentButton.textContent?.includes(text),
  );
}

describe("FlashcardsManagerToolbar", () => {
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

  it("opens the create action", async () => {
    await act(async () => {
      root.render(<FlashcardsManagerToolbar {...baseProps} />);
    });

    const button = Array.from(container.querySelectorAll("button")).find(
      (currentButton) => currentButton.textContent?.includes("New Flashcard"),
    ) as HTMLButtonElement | undefined;

    expect(button).toBeTruthy();
    expect(button?.disabled).toBe(false);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(baseProps.onOpenCreateDialog).toHaveBeenCalledOnce();
  });

  it("shows an unavailable count when the manage read fails", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar
          {...baseProps}
          total={17}
          hasManageScopeError
        />,
      );
    });

    expect(container.textContent).toContain("Flashcards unavailable");
    expect(container.textContent).not.toContain("17 of 17 flashcards");
  });

  it("shows hover and focus tooltips for selection toolbar actions", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar
          {...baseProps}
          selectedFlashcardIds={["flashcard-1"]}
        />,
      );
    });

    const moveButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Move"]',
    );
    const resetButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Reset"]',
    );
    const deleteButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Delete"]',
    );
    const clearSelectionButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Clear selection"]',
    );

    expect(moveButton).toBeTruthy();
    expect(resetButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();
    expect(clearSelectionButton).toBeTruthy();

    await act(async () => {
      moveButton?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain("Move");

    await act(async () => {
      resetButton?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain("Reset");

    await act(async () => {
      deleteButton?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain("Delete");

    await act(async () => {
      clearSelectionButton?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain("Clear selection");
  });

  it("copies the selection and disables the copy action while copying", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar
          {...baseProps}
          selectedFlashcardIds={["flashcard-1"]}
        />,
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Copy"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(baseProps.onCopySelection).toHaveBeenCalledOnce();

    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar
          {...baseProps}
          selectedFlashcardIds={["flashcard-1"]}
          isCopyingSelection
        />,
      );
    });

    const copyingButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Copying..."]',
    );
    expect(copyingButton?.disabled).toBe(true);
  });

  it("hides the refine entry when AI is disabled", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar {...baseProps} aiEnabled={false} />,
      );
    });

    expect(findButtonByText(container, "Refine cards")).toBeUndefined();
  });

  it("starts the refine flow from the Refine cards button", async () => {
    await act(async () => {
      root.render(<FlashcardsManagerToolbar {...baseProps} aiEnabled />);
    });

    await act(async () => {
      findButtonByText(container, "Refine cards")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(baseProps.onStartRefine).toHaveBeenCalledOnce();
  });

  it("disables the refine entry while struggling cards are loading", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar
          {...baseProps}
          aiEnabled
          isLoadingStrugglingCards
        />,
      );
    });

    const refineItem = findButtonByText(container, "Refine cards");

    expect(refineItem?.disabled).toBe(true);
  });

  it("shows refine counts and mode actions in refine mode", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar
          {...baseProps}
          aiEnabled
          refineMode
          strugglingCount={3}
        />,
      );
    });

    expect(container.textContent).toContain("3 struggling");

    const refreshButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Refresh Refine"]',
    );
    const exitButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Exit Refine"]',
    );

    expect(refreshButton).toBeTruthy();
    expect(exitButton).toBeTruthy();

    await act(async () => {
      refreshButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      exitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(baseProps.onRefreshRefine).toHaveBeenCalledOnce();
    expect(baseProps.onExitRefine).toHaveBeenCalledOnce();
  });
});
