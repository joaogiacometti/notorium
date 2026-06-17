import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppearanceCard } from "@/components/account/appearance-card";

const { setThemeMock, updateUserThemeMock, themeState } = vi.hoisted(() => ({
  setThemeMock: vi.fn(),
  updateUserThemeMock: vi.fn(),
  themeState: {
    theme: "dark",
    resolvedTheme: "dark",
  },
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: themeState.theme,
    resolvedTheme: themeState.resolvedTheme,
    setTheme: setThemeMock,
  }),
}));

vi.mock("@/app/actions/theme", () => ({
  updateUserTheme: updateUserThemeMock,
}));

function findOptionByLabel(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(label),
  );
}

describe("AppearanceCard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    setThemeMock.mockReset();
    updateUserThemeMock.mockReset();
    themeState.theme = "dark";
    themeState.resolvedTheme = "dark";
    updateUserThemeMock.mockResolvedValue({ success: true });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("renders every theme option and marks the current one selected", async () => {
    await act(async () => {
      root.render(<AppearanceCard />);
    });

    const darkOption = findOptionByLabel(container, "Dark");
    expect(darkOption).toBeTruthy();
    expect(darkOption?.getAttribute("aria-pressed")).toBe("true");
    expect(findOptionByLabel(container, "Light")).toBeTruthy();
    expect(findOptionByLabel(container, "Catppuccin mocha")).toBeTruthy();
  });

  it("persists the chosen theme to the server", async () => {
    await act(async () => {
      root.render(<AppearanceCard />);
    });

    const lightOption = findOptionByLabel(container, "Light");

    await act(async () => {
      lightOption?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(setThemeMock).toHaveBeenCalledWith("light");
    expect(updateUserThemeMock).toHaveBeenCalledWith({ theme: "light" });
  });
});
