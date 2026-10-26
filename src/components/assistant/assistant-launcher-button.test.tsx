import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantLauncherButton } from "@/components/assistant/assistant-launcher-button";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { StudyAssistant } from "@/components/assistant/study-assistant";

vi.mock("@/app/actions/assistant-preferences", () => ({
  setTutoringModePreference: async () => {},
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const LAUNCHER_LABEL = "Open study assistant";

describe("assistant launcher button", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function render(session: ReactNode) {
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <AssistantWorkspaceProvider>
            <StudyAssistant />
            {session}
          </AssistantWorkspaceProvider>
        </QueryClientProvider>,
      );
    });
  }

  function launchers(): HTMLButtonElement[] {
    return [
      ...document.querySelectorAll<HTMLButtonElement>(
        `[aria-label="${LAUNCHER_LABEL}"]`,
      ),
    ];
  }

  function pressShortcut(target: Element, init: KeyboardEventInit) {
    act(() => {
      target.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "j",
          bubbles: true,
          cancelable: true,
          ...init,
        }),
      );
    });
  }

  it("renders nothing outside the assistant workspace", async () => {
    await act(async () => {
      root.render(<AssistantLauncherButton />);
    });

    expect(container.querySelector("button")).toBeNull();
  });

  it("replaces the floating launcher while a session header hosts it", async () => {
    await render(<AssistantLauncherButton />);

    expect(launchers()).toHaveLength(1);
    expect(launchers()[0]?.closest(".fixed")).toBeNull();

    await render(null);

    expect(launchers()).toHaveLength(1);
    expect(launchers()[0]?.closest(".fixed")).not.toBeNull();
  });

  it("toggles the panel and reflects it in aria-expanded", async () => {
    await render(<AssistantLauncherButton />);

    await act(async () => launchers()[0]?.click());

    const panel = document.querySelector("#study-assistant-panel");
    expect(panel?.classList.contains("hidden")).toBe(false);
    expect(launchers()[0]?.getAttribute("aria-expanded")).toBe("true");
  });

  it("returns focus to the header launcher after minimizing", async () => {
    await render(<AssistantLauncherButton />);
    await act(async () => launchers()[0]?.click());
    const minimizeSelector = '[aria-label="Minimize study assistant"]';
    await vi.waitFor(
      () => {
        expect(document.querySelector(minimizeSelector)).not.toBeNull();
      },
      { timeout: 5000 },
    );

    await act(async () => {
      document.querySelector<HTMLButtonElement>(minimizeSelector)?.click();
    });

    expect(document.activeElement).toBe(launchers()[0]);
  });

  it("toggles with Ctrl+J, including from inside the panel", async () => {
    await render(null);

    pressShortcut(document.body, { ctrlKey: true });
    const panel = () => document.querySelector("#study-assistant-panel");
    expect(panel()?.classList.contains("hidden")).toBe(false);

    pressShortcut(panel() as Element, { ctrlKey: true });
    expect(panel()?.classList.contains("hidden")).toBe(true);
  });

  it("ignores J without Ctrl/Cmd or with extra modifiers", async () => {
    await render(null);

    pressShortcut(document.body, {});
    pressShortcut(document.body, { ctrlKey: true, shiftKey: true });

    expect(document.querySelector("#study-assistant-panel")).toBeNull();
  });
});
