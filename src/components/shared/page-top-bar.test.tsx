import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageTopBar } from "@/components/shared/page-top-bar";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("PageTopBar", () => {
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

  async function renderBar() {
    await act(async () => {
      root.render(
        <PageTopBar
          breadcrumb={[
            { label: "Physics", href: "/subjects/p", icon: "book-open" },
            { label: "Documents", href: "/subjects/p/documents/notes/n1" },
            { label: "Lecture 3" },
          ]}
        />,
      );
    });
  }

  it("links ancestor crumbs to their href", async () => {
    await renderBar();

    const links = Array.from(container.querySelectorAll("a"));
    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute("href")).toBe("/subjects/p");
    expect(links[1]?.getAttribute("href")).toBe(
      "/subjects/p/documents/notes/n1",
    );
  });

  it("renders the current crumb as unlinked, marked aria-current", async () => {
    await renderBar();

    const current = container.querySelector('[aria-current="page"]');
    expect(current?.textContent).toContain("Lecture 3");
    expect(current?.tagName).not.toBe("A");
  });

  it("exposes the trail under a Breadcrumb nav landmark", async () => {
    await renderBar();

    const nav = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(nav?.textContent).toContain("Physics");
    expect(nav?.textContent).toContain("Documents");
  });
});
