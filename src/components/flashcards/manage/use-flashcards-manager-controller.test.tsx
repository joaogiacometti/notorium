import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFlashcardsManagerController } from "@/components/flashcards/manage/use-flashcards-manager-controller";
import type { FlashcardManagePage } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

type ManagerController = ReturnType<typeof useFlashcardsManagerController>;

const fetchManagePageMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/flashcards",
}));

vi.mock("@/lib/read-api/flashcards", () => ({
  fetchFlashcardsManagePage: fetchManagePageMock,
}));

const emptyPageData: FlashcardManagePage = {
  items: [],
  total: 0,
  subjectCardCount: null,
};

function ControllerHarness({
  onController,
}: Readonly<{ onController: (controller: ManagerController) => void }>) {
  const controller = useFlashcardsManagerController({
    initialPageData: emptyPageData,
    initialPageSize: 25,
  });

  onController(controller);
  return null;
}

describe("useFlashcardsManagerController", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;
  let controller: ManagerController;

  async function renderController() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ControllerHarness
            onController={(nextController) => {
              controller = nextController;
            }}
          />
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
    fetchManagePageMock.mockResolvedValue(emptyPageData);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it.each(["studyLater", "struggling"] as const)(
    "reads the %s filter and resets to the first page",
    async (filter) => {
      await renderController();

      await act(async () => {
        controller.setPageIndex(2);
      });
      await act(async () => {
        controller.setFilter(filter);
      });

      expect(controller.pageIndex).toBe(0);
      await vi.waitFor(() =>
        expect(fetchManagePageMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ pageIndex: 0, filter }),
        ),
      );
    },
  );

  it("surfaces a failed page read through query state", async () => {
    fetchManagePageMock.mockRejectedValue(new Error("offline"));
    await renderController();

    await act(async () => {
      controller.handleSubjectChange("subject-2");
    });
    await vi.waitFor(() =>
      expect(controller.managePageQuery.isError).toBe(true),
    );
    expect(controller.managePageQuery.error).toBeInstanceOf(Error);
    expect(fetchManagePageMock).toHaveBeenCalledOnce();
  });

  it("replaces the active dialog and clears it on close", async () => {
    await renderController();

    await act(async () => {
      controller.setDialog({ kind: "create" });
    });
    await act(async () => {
      controller.setDialog({ kind: "bulk-delete" });
    });
    expect(controller.dialog).toEqual({ kind: "bulk-delete" });

    await act(async () => {
      controller.setDialog(null);
    });
    expect(controller.dialog).toBeNull();
  });
});
