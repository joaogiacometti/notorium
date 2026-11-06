import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardsPageClient } from "./flashcards-page-client";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/flashcards",
  useTransition: () => [false, vi.fn()],
}));

vi.mock("@/components/flashcards/manage/flashcards-manager", () => ({
  FlashcardsManager: () => <div data-testid="flashcards-manager" />,
}));

const mockManagePageData: import("@/lib/server/api-contracts").FlashcardManagePage =
  {
    items: [],
    total: 0,
    folderCardCount: null,
  };

const mockReviewSummary: import("@/lib/server/api-contracts").FlashcardReviewSummary =
  { dueCount: 3, totalCount: 10 };

const mockFolders: import("@/lib/server/api-contracts").FolderOption[] = [
  {
    id: "folder-1",
    name: "Database 1",
    path: "CS::Database 1",
    userId: "user-1",
    parentFolderId: "folder-parent",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

const defaultProps: ComponentProps<typeof FlashcardsPageClient> = {
  currentView: "manage",
  scopedFolderId: undefined,
  initialPageSize: 25,
  folders: mockFolders,
  initialManagePageData: mockManagePageData,
  reviewSummary: mockReviewSummary,
};

describe("FlashcardsPageClient", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  function render(props: Partial<typeof defaultProps> = {}) {
    return act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <FlashcardsPageClient {...defaultProps} {...props} />
        </QueryClientProvider>,
      );
    });
  }

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("always shows the folder scope filter and no deck tree", async () => {
    await render();

    expect(
      container.querySelector('[data-testid="folder-scope-filter"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeNull();
  });

  it("renders the manager on the manage view", async () => {
    await render();

    expect(
      container.querySelector('[data-testid="flashcards-manager"]'),
    ).toBeTruthy();
  });

  it("links the review hub to the scoped session pages", async () => {
    await render({ currentView: "review", scopedFolderId: "folder-1" });

    const reviewLink = container.querySelector(
      '[data-testid="flashcard-review-start-button"]',
    );
    const examLink = container.querySelector(
      '[data-testid="flashcard-exam-start-button"]',
    );

    expect(reviewLink?.getAttribute("href")).toBe(
      "/flashcards/review?folderId=folder-1",
    );
    expect(examLink?.getAttribute("href")).toBe(
      "/flashcards/exam?folderId=folder-1",
    );
  });

  it("disables the review start when no cards are due", async () => {
    await render({
      currentView: "review",
      reviewSummary: { dueCount: 0, totalCount: 4 },
    });

    const reviewButton = container.querySelector<HTMLButtonElement>(
      '[data-testid="flashcard-review-start-button"]',
    );

    expect(reviewButton?.disabled).toBe(true);
  });
});
