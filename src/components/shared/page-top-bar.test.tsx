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
          breadcrumb={{
            parent: {
              label: "Flashcards",
              href: "/flashcards",
              icon: "layers",
            },
            current: { label: "Biology::Cells" },
          }}
        />,
      );
    });
  }

  it("renders crumbs that share a label without duplicate keys", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    await act(async () => {
      root.render(
        <PageTopBar
          breadcrumb={{
            parent: { label: "Prolog", icon: "book-open" },
            current: { label: "Prolog" },
          }}
        />,
      );
    });

    expect(container.textContent).toBe("PrologProlog");
    const messages = consoleError.mock.calls.map((call) => call.join(" "));
    expect(messages.filter((message) => message.includes("same key"))).toEqual(
      [],
    );
    consoleError.mockRestore();
  });

  it("links the parent crumb to its href", async () => {
    await renderBar();

    const links = Array.from(container.querySelectorAll("a"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/flashcards",
    ]);
  });

  it("renders the current crumb as unlinked, marked aria-current", async () => {
    await renderBar();

    const current = container.querySelector('[aria-current="page"]');
    expect(current?.textContent).toContain("Biology::Cells");
    expect(current?.tagName).not.toBe("A");
  });

  it("exposes the trail under a Breadcrumb nav landmark", async () => {
    await renderBar();

    const nav = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(nav?.textContent).toContain("Flashcards");
    expect(nav?.textContent).toContain("Biology::Cells");
  });
});
