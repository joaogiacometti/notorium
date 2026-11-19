import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardsManagerToolbar } from "@/components/flashcards/manage/flashcards-manager-toolbar";
import type { BulkCardMarks } from "@/components/flashcards/manage/use-bulk-card-marks";

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
  onFilterChange: vi.fn(),
  isCopyingSelection: false,
  onCopySelection: vi.fn(),
  onOpenCreateDialog: vi.fn(),
  onOpenBulkMoveDialog: vi.fn(),
  onOpenBulkDeleteDialog: vi.fn(),
  onOpenBulkResetDialog: vi.fn(),
  onClearSelection: vi.fn(),
  bulkMarks: {
    intents: { studyLater: "mark", archive: "archive" },
    isSaving: false,
    applyStudyLater: vi.fn(),
    applyArchive: vi.fn(),
  } as BulkCardMarks,
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
      (currentButton) =>
        currentButton.textContent?.includes("Create flashcard"),
    ) as HTMLButtonElement | undefined;

    expect(button).toBeTruthy();
    expect(button?.disabled).toBe(false);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(baseProps.onOpenCreateDialog).toHaveBeenCalledOnce();
  });

  it.each([
    [undefined, "In review"],
    ["studyLater", "Study later"],
    ["struggling", "Struggling"],
    ["archived", "Archived"],
    ["all", "All cards"],
  ] as const)("shows the %s filter as %s", async (filter, label) => {
    await act(async () => {
      root.render(<FlashcardsManagerToolbar {...baseProps} filter={filter} />);
    });

    expect(
      container.querySelector('[role="combobox"][aria-label="Show cards"]')
        ?.textContent,
    ).toBe(label);
  });

  it.each([
    ["Archived", "archived"],
    ["In review", undefined],
  ] as const)("picking %s sets the filter", async (label, filter) => {
    await act(async () => {
      root.render(<FlashcardsManagerToolbar {...baseProps} filter="all" />);
    });
    const trigger = container.querySelector<HTMLElement>(
      '[role="combobox"][aria-label="Show cards"]',
    );

    await act(async () => {
      trigger?.focus();
      trigger?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    const option = Array.from(
      document.querySelectorAll<HTMLElement>('[role="option"]'),
    ).find((item) => item.textContent === label);
    await act(async () => {
      option?.focus();
      option?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });

    expect(baseProps.onFilterChange).toHaveBeenCalledExactlyOnceWith(filter);
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
    expect(container.textContent).not.toContain("17 flashcards");
  });

  it.each([
    [1, "1 flashcard"],
    [17, "17 flashcards"],
  ])("counts %i matching cards as %s", async (total, label) => {
    await act(async () => {
      root.render(<FlashcardsManagerToolbar {...baseProps} total={total} />);
    });

    expect(container.textContent).toContain(label);
    expect(container.textContent).not.toContain(" of ");
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
      'button[aria-label="Copying…"]',
    );
    expect(copyingButton?.disabled).toBe(true);
  });

  it("runs bulk study later and archive on the selection", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar
          {...baseProps}
          selectedFlashcardIds={["flashcard-1"]}
        />,
      );
    });

    await act(async () => {
      for (const label of ["Study later", "Archive"]) {
        container
          .querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    });

    expect(baseProps.bulkMarks.applyStudyLater).toHaveBeenCalledOnce();
    expect(baseProps.bulkMarks.applyArchive).toHaveBeenCalledOnce();
  });

  it("offers clearing and unarchiving when the selection already has them", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar
          {...baseProps}
          selectedFlashcardIds={["flashcard-1"]}
          bulkMarks={{
            ...baseProps.bulkMarks,
            intents: { studyLater: "clear", archive: "unarchive" },
          }}
        />,
      );
    });

    expect(
      container.querySelector('button[aria-label="Clear study later"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="Unarchive"]'),
    ).not.toBeNull();
  });

  it("disables bulk study later when every selected card is archived", async () => {
    await act(async () => {
      root.render(
        <FlashcardsManagerToolbar
          {...baseProps}
          selectedFlashcardIds={["flashcard-1"]}
          bulkMarks={{
            ...baseProps.bulkMarks,
            intents: { studyLater: null, archive: "archive" },
          }}
        />,
      );
    });

    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Study later"]',
      )?.disabled,
    ).toBe(true);
  });
});
