import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardsManagerTable } from "@/components/flashcards/manage/flashcards-manager-table";
import type { FlashcardManageItem } from "@/lib/server/api-contracts";
import { testDocument } from "@/test/document";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/components/flashcards/manage/flashcards-table-row-actions", () => ({
  FlashcardsTableRowActions: () => null,
}));

function createFlashcard(
  overrides: Partial<FlashcardManageItem> = {},
): FlashcardManageItem {
  return {
    id: "flashcard-1",
    folderId: "deck-1",
    front: testDocument("Very long front content for a flashcard manager row"),
    frontExcerpt: "Very long front content for a flashcard manager row",
    frontTitle: "Very long front content for a flashcard manager row",
    folderName: "Biology",
    folderPath: "Biology / Cells",
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
    studyLaterAt: null,
    archivedAt: null,
    lapseCount: 0,
    ...overrides,
  };
}

describe("FlashcardsManagerTable", () => {
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

  it("shows the full front excerpt and leaves truncation to the column width", async () => {
    await renderTable([createFlashcard()]);

    expect(container.textContent).toContain(
      "Very long front content for a flashcard manager row",
    );
  });

  it("marks study-later rows like archived ones", async () => {
    await renderTable([
      createFlashcard({ id: "plain" }),
      createFlashcard({ id: "marked", studyLaterAt: new Date() }),
    ]);

    expect(
      container.querySelectorAll('[aria-label="Study later"]'),
    ).toHaveLength(1);
  });

  it("marks archived rows so they read as out of review", async () => {
    await renderTable([
      createFlashcard({ id: "active" }),
      createFlashcard({ id: "archived", archivedAt: new Date() }),
    ]);

    expect(container.querySelectorAll('[aria-label="Archived"]')).toHaveLength(
      1,
    );
  });

  it("shows lapse counts only when asked", async () => {
    const flashcards = [createFlashcard({ lapseCount: 6 })];

    await renderTable(flashcards);
    expect(container.querySelector('[aria-label="Forgotten 6 times"]')).toBe(
      null,
    );

    await renderTable(flashcards, { showLapseCount: true });
    expect(
      container.querySelector('[aria-label="Forgotten 6 times"]')?.textContent,
    ).toBe("6");
  });

  async function renderTable(
    flashcards: FlashcardManageItem[],
    { showLapseCount = false }: { showLapseCount?: boolean } = {},
  ) {
    await act(async () => {
      root.render(
        <FlashcardsManagerTable
          flashcards={flashcards}
          total={flashcards.length}
          selectedFlashcardIds={[]}
          pageIndex={0}
          pageSize={25}
          isLoading={false}
          showLapseCount={showLapseCount}
          onCopyRequested={() => {}}
          onMoveRequested={() => {}}
          onPageIndexChange={() => {}}
          onPageSizeChange={() => {}}
          onDeleteRequested={() => {}}
          onResetRequested={() => {}}
          onStudyLaterToggleRequested={() => {}}
          onArchiveToggleRequested={() => {}}
          onSelectedFlashcardIdsChange={() => {}}
        />,
      );
    });
  }
});
