import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/navbar/app-sidebar";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/planning",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/navbar/account-menu", () => ({
  AccountMenu: ({ accountName }: { accountName: string }) => (
    <div data-testid="account-menu">{accountName}</div>
  ),
}));

vi.mock("@/components/navbar/app-sidebar-nav", () => ({
  AppSidebarNav: ({ onOpenSearch }: { onOpenSearch: () => void }) => (
    <nav data-testid="app-sidebar-nav">
      <button type="button" onClick={onOpenSearch}>
        Search
      </button>
    </nav>
  ),
}));

vi.mock("@/components/subjects/tree/subject-tree-sidebar", () => ({
  SubjectTreeSidebar: () => <div data-testid="subject-tree" />,
}));

function findByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("*")).find(
    (element) => element.textContent?.trim() === text,
  );
}

describe("AppSidebar", () => {
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

  it("renders account and search, with no brand link or Home row", async () => {
    await act(async () => {
      root.render(
        <AppSidebar
          tree={[]}
          subjects={[]}
          aiEnabled={false}
          accountName="João"
          email="joao@example.com"
          isAdmin={false}
          onOpenSearch={() => {}}
        />,
      );
    });

    expect(
      container.querySelector('[data-testid="account-menu"]')?.textContent,
    ).toBe("João");
    expect(findByText(container, "Search")).toBeTruthy();
    // The brand link to "/" was removed; the account button sits at the top.
    expect(findByText(container, "Notorium")).toBeFalsy();
    // The "Home" entry was removed: the app always opens a subject instead.
    expect(findByText(container, "Home")).toBeFalsy();
  });

  it("fires onOpenSearch when the search row is clicked", async () => {
    const onOpenSearch = vi.fn();

    await act(async () => {
      root.render(
        <AppSidebar
          tree={[]}
          subjects={[]}
          aiEnabled={false}
          accountName="João"
          email="joao@example.com"
          isAdmin={false}
          onOpenSearch={onOpenSearch}
        />,
      );
    });

    const searchButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Search"),
    );

    await act(async () => {
      searchButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onOpenSearch).toHaveBeenCalledOnce();
  });
});
