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
  filter: undefined,
  onToggleFilter: vi.fn(),
  isCopyingSelection: false,
  onCopySelection: vi.fn(),
  onOpenCreateDialog: vi.fn(),
  onOpenBulkMoveDialog: vi.fn(),
  onOpenBulkDeleteDialog: vi.fn(),
  onOpenBulkResetDialog: vi.fn(),
  onClearSelection: vi.fn(),
};

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

  it.each([
    ["studyLater", "Study later"],
    ["struggling", "Struggling"],
  ] as const)(
    "toggles the %s filter and shows when it is on",
    async (filter, label) => {
      const selector = `button[aria-label="Show ${label} cards"]`;
      await act(async () => {
        root.render(<FlashcardsManagerToolbar {...baseProps} />);
      });
      const button = container.querySelector<HTMLButtonElement>(selector);
      expect(button?.getAttribute("aria-pressed")).toBe("false");

      await act(async () => {
        button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(baseProps.onToggleFilter).toHaveBeenCalledExactlyOnceWith(filter);

      await act(async () => {
        root.render(
          <FlashcardsManagerToolbar {...baseProps} filter={filter} />,
        );
      });
      expect(
        container.querySelector(selector)?.getAttribute("aria-pressed"),
      ).toBe("true");
    },
  );

  it("presses only the active filter chip", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar {...baseProps} filter="struggling" />,
      );
    });

    const pressedLabels = Array.from(
      container.querySelectorAll('button[aria-pressed="true"]'),
    ).map((button) => button.getAttribute("aria-label"));
    expect(pressedLabels).toEqual(["Show Struggling cards"]);
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
});
