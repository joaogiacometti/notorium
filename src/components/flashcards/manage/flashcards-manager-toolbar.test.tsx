import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardsManagerToolbar } from "@/components/flashcards/manage/flashcards-manager-toolbar";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) =>
    children,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const baseProps = {
  searchQuery: "",
  onSearchQueryChange: vi.fn(),
  validationMode: false,
  isManageScopeLoading: false,
  selectedFlashcardIds: [],
  total: 0,
  validationIssuesCount: 0,
  isValidatingAgain: false,
  refineMode: false,
  refineMasteredCount: 0,
  refineStrugglingCount: 0,
  isLoadingRefineGroups: false,
  aiEnabled: false,
  hasDecks: true,
  onOpenValidateDialog: vi.fn(),
  onOpenCreateDialog: vi.fn(),
  onOpenValidateAgainDialog: vi.fn(),
  onExitValidation: vi.fn(),
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

  it("enables the create action when decks exist", async () => {
    await act(async () => {
      root.render(<FlashcardsManagerToolbar {...baseProps} hasDecks />);
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

  it("disables the create action and shows a tooltip when no decks exist", async () => {
    await act(async () => {
      root.render(<FlashcardsManagerToolbar {...baseProps} hasDecks={false} />);
    });

    const button = Array.from(container.querySelectorAll("button")).find(
      (currentButton) => currentButton.textContent?.includes("New Flashcard"),
    ) as HTMLButtonElement | undefined;
    const trigger = container.querySelector<HTMLElement>(
      '[data-testid="new-flashcard-disabled-trigger"]',
    );

    expect(button).toBeTruthy();
    expect(button?.disabled).toBe(true);
    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain(
      "Create a deck first to add flashcards.",
    );

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(baseProps.onOpenCreateDialog).not.toHaveBeenCalled();
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

  it("shows hover and focus tooltips for validation toolbar actions", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar
          {...baseProps}
          validationMode
          validationIssuesCount={2}
        />,
      );
    });

    const validateAgainButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Validate Again"]',
    );
    const exitValidationButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Exit Validation"]',
    );

    expect(validateAgainButton).toBeTruthy();
    expect(exitValidationButton).toBeTruthy();

    await act(async () => {
      validateAgainButton?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain("Validate Again");

    await act(async () => {
      exitValidationButton?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain("Exit Validation");
  });

  it("hides the AI dropdown when AI is disabled", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar {...baseProps} aiEnabled={false} />,
      );
    });

    expect(findButtonByText(container, "Validate cards")).toBeUndefined();
    expect(findButtonByText(container, "Refine cards")).toBeUndefined();
  });

  it("triggers validate and refine flows from the AI dropdown", async () => {
    await act(async () => {
      root.render(<FlashcardsManagerToolbar {...baseProps} aiEnabled />);
    });

    const validateItem = findButtonByText(container, "Validate cards");
    const refineItem = findButtonByText(container, "Refine cards");

    expect(validateItem).toBeTruthy();
    expect(refineItem).toBeTruthy();

    await act(async () => {
      validateItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      refineItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(baseProps.onOpenValidateDialog).toHaveBeenCalledOnce();
    expect(baseProps.onStartRefine).toHaveBeenCalledOnce();
  });

  it("disables the refine entry while refine groups are loading", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar
          {...baseProps}
          aiEnabled
          isLoadingRefineGroups
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
          refineMasteredCount={2}
          refineStrugglingCount={1}
        />,
      );
    });

    expect(container.textContent).toContain("2 mastered · 1 struggling");

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
