import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSettingsProvider } from "@/components/account/account-settings-provider";

const { routerReplaceMock } = vi.hoisted(() => ({
  routerReplaceMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
}));

vi.mock("@/lib/read-api/account", () => ({
  fetchAccountSettings: vi.fn(),
}));

vi.mock("@/components/account/settings-dialog", () => ({
  SettingsDialog: ({
    open,
    activeSection,
  }: {
    open: boolean;
    activeSection: string;
  }) =>
    open ? <div data-testid="settings-dialog">{activeSection}</div> : null,
}));

describe("AccountSettingsProvider deep link", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  async function renderProvider() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <AccountSettingsProvider userId="user-1">
            <span>app</span>
          </AccountSettingsProvider>
        </QueryClientProvider>,
      );
    });
  }

  // Regression: stripping the param with a raw history.replaceState ran before
  // the Next.js router patched history, so the router kept the old URL and the
  // next Server Action restored `?settings=` (and a reload reopened the dialog).
  it("opens the requested section and strips the param through the router", async () => {
    window.history.replaceState(
      null,
      "",
      "/flashcards?settings=flashcards&view=manage",
    );

    await renderProvider();

    expect(
      container.querySelector('[data-testid="settings-dialog"]')?.textContent,
    ).toBe("flashcards");
    expect(routerReplaceMock).toHaveBeenCalledWith("/flashcards?view=manage", {
      scroll: false,
    });
  });

  it("leaves the URL alone when no deep link is present", async () => {
    window.history.replaceState(null, "", "/flashcards");

    await renderProvider();

    expect(
      container.querySelector('[data-testid="settings-dialog"]'),
    ).toBeNull();
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });
});
