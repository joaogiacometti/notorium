import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { GlobalSearch } from "@/components/navbar/global-search";
import { ShortcutsDialogOpenProvider } from "@/components/shortcuts/shortcuts-suspension-context";
import type { SearchData } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

class FakeSearchApi {
  matches: SearchData = { notes: [], pdfs: [], flashcards: [] };
  searchedQueries: string[] = [];
  /** When true, searches never settle, simulating a slow server. */
  holdSearches = false;

  fetchSearchData = async (query: string): Promise<SearchData> => {
    this.searchedQueries.push(query);
    return this.holdSearches ? new Promise(() => {}) : this.matches;
  };
}

let api = new FakeSearchApi();
const routerPushMock = vi.fn();
const openSettingsMock = vi.fn();
const setAppThemeMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: routerPushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/read-api/search", () => ({
  fetchSearchData: (query: string) => api.fetchSearchData(query),
}));

vi.mock("@/lib/read-api/subjects", () => ({
  fetchSubjectOptions: async () => [],
}));

vi.mock("@/components/account/account-settings-provider", () => ({
  useOpenAccountSettings: () => openSettingsMock,
}));

vi.mock("@/components/navbar/use-theme-control", () => ({
  useThemeControl: () => ({ setAppTheme: setAppThemeMock }),
}));

vi.mock("@/components/navbar/search-create-dialogs", () => ({
  SearchCreateDialogs: ({ activeDialog }: { activeDialog: string | null }) =>
    activeDialog ? <div data-testid="create-dialog">{activeDialog}</div> : null,
}));

function note(id: string, title: string): SearchData["notes"][number] {
  return {
    id,
    title,
    content: null,
    subjectId: "subject-1",
    subjectName: "Biology",
  };
}

function pdf(id: string, title: string): SearchData["pdfs"][number] {
  return { id, title, subjectId: "subject-1", subjectName: "Biology" };
}

function flashcard(
  id: string,
  front: string,
): SearchData["flashcards"][number] {
  return {
    id,
    front,
    back: "",
    subjectId: "subject-1",
    subjectName: "Biology",
    subjectPath: "Biology",
  };
}

describe("GlobalSearch", () => {
  let container: HTMLDivElement;
  let root: Root;
  let onOpenChange: Mock<(open: boolean) => void>;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    api = new FakeSearchApi();
    routerPushMock.mockClear();
    openSettingsMock.mockClear();
    setAppThemeMock.mockClear();
    onOpenChange = vi.fn<(open: boolean) => void>();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  // Each act() flushes React updates only when it exits, so the debounce
  // timer, the fetch, and the query notification need separate rounds.
  async function settle(rounds = 8) {
    for (let round = 0; round < rounds; round += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
    }
  }

  async function renderSearch(shortcutsDialogOpen = false) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ShortcutsDialogOpenProvider
            shortcutsDialogOpen={shortcutsDialogOpen}
          >
            <GlobalSearch
              userId="user-1"
              aiEnabled={false}
              open
              onOpenChange={onOpenChange}
            />
          </ShortcutsDialogOpenProvider>
        </QueryClientProvider>,
      );
    });
    await settle();
  }

  async function typeQuery(value: string) {
    const input = document.querySelector<HTMLInputElement>("[cmdk-input]");
    if (!input) {
      throw new Error("Expected the search input to be rendered");
    }
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    await act(async () => {
      setValue?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await settle();
  }

  function optionLabels(): string[] {
    return Array.from(document.querySelectorAll("[cmdk-item]")).map(
      (item) => item.textContent?.trim() ?? "",
    );
  }

  function clickOption(label: string) {
    const item = Array.from(document.querySelectorAll("[cmdk-item]")).find(
      (candidate) => candidate.textContent?.includes(label),
    );
    if (!item) {
      throw new Error(`Expected an option containing "${label}"`);
    }
    act(() => item.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  }

  it("shows only commands before typing, without loading anything", async () => {
    await renderSearch();
    const labels = optionLabels();
    expect(labels).toContain("Create Subject");
    expect(labels).toContain("Show Keyboard Shortcuts");
    expect(api.searchedQueries).toEqual([]);
    expect(document.body.textContent).not.toContain("Searching");
  });

  it("lists matching notes and flashcards once the user types", async () => {
    api.matches = {
      notes: [note("n1", "Cell cycle")],
      pdfs: [],
      flashcards: [flashcard("f1", "Cell membrane")],
    };
    await renderSearch();
    await typeQuery("cell");

    const labels = optionLabels();
    expect(labels.some((label) => label.startsWith("Cell cycle"))).toBe(true);
    expect(labels.some((label) => label.startsWith("Cell membrane"))).toBe(
      true,
    );
  });

  it("filters commands without a server search for a one-character query", async () => {
    await renderSearch();
    await typeQuery("m");

    expect(optionLabels()).toContain("Theme: Dark");
    expect(optionLabels()).not.toContain("Create Subject");
    expect(api.searchedQueries).toEqual([]);
  });

  it("lists matching commands together with server results", async () => {
    api.matches = {
      notes: [note("n1", "Subject notes")],
      pdfs: [],
      flashcards: [],
    };
    await renderSearch();
    await typeQuery("subject");

    const labels = optionLabels();
    expect(api.searchedQueries).toEqual(["subject"]);
    expect(labels).toContain("Create Subject");
    expect(labels.some((label) => label.startsWith("Subject notes"))).toBe(
      true,
    );
    expect(labels).not.toContain("Theme: Dark");
  });

  it("shows a searching row instead of the empty message while searching", async () => {
    api.holdSearches = true;
    await renderSearch();
    await typeQuery("zzzz");

    expect(document.body.textContent).toContain("Searching");
    expect(document.body.textContent).not.toContain("No matching");
  });

  it("keeps previous matches while a refined search loads", async () => {
    api.matches = {
      notes: [note("n1", "Cell cycle")],
      pdfs: [],
      flashcards: [],
    };
    await renderSearch();
    await typeQuery("cell");
    api.holdSearches = true;
    await typeQuery("cell c");

    expect(api.searchedQueries).toEqual(["cell", "cell c"]);
    expect(optionLabels().some((label) => label.startsWith("Cell cycle"))).toBe(
      true,
    );
    expect(document.body.textContent).not.toContain("Searching");
  });

  it("shows an empty message when nothing matches", async () => {
    await renderSearch();
    await typeQuery("zzzz");

    expect(document.body.textContent).toContain(
      "No matching commands, notes, PDFs, or flashcards.",
    );
  });

  it("navigates and closes when a result is selected", async () => {
    api.matches = {
      notes: [note("n1", "Cell cycle")],
      pdfs: [],
      flashcards: [],
    };
    await renderSearch();
    await typeQuery("cell");
    clickOption("Cell cycle");

    expect(routerPushMock).toHaveBeenCalledWith(expect.stringContaining("n1"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("lists matching PDFs and opens the reader when one is selected", async () => {
    api.matches = {
      notes: [],
      pdfs: [pdf("p1", "Cell biology textbook")],
      flashcards: [],
    };
    await renderSearch();
    await typeQuery("cell");
    clickOption("Cell biology textbook");

    expect(routerPushMock).toHaveBeenCalledWith(
      "/subjects/subject-1/documents/pdfs/p1",
    );
  });

  it("runs a command and closes the dialog", async () => {
    await renderSearch();
    clickOption("Theme: Dark");

    expect(setAppThemeMock).toHaveBeenCalledWith("dark");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("opens the create dialog for a create command", async () => {
    await renderSearch();
    clickOption("Create Note");

    expect(
      document.querySelector('[data-testid="create-dialog"]')?.textContent,
    ).toBe("note");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("opens the Add PDF dialog for the Create PDF command", async () => {
    await renderSearch();
    clickOption("Create PDF");

    expect(
      document.querySelector('[data-testid="create-dialog"]')?.textContent,
    ).toBe("pdf");
  });

  it("toggles on Ctrl+K but not while the shortcuts dialog is open", async () => {
    await renderSearch();
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
      );
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    await renderSearch(true);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
      );
    });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
