import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppearanceCard } from "@/components/account/appearance-card";

const {
  invalidateQueriesMock,
  setThemeMock,
  updateReaderColorModeMock,
  updateUserThemeMock,
  themeState,
} = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
  setThemeMock: vi.fn(),
  updateReaderColorModeMock: vi.fn(),
  updateUserThemeMock: vi.fn(),
  themeState: {
    theme: "dark",
    resolvedTheme: "dark",
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
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

vi.mock("@/app/actions/account", () => ({
  updateReaderColorMode: updateReaderColorModeMock,
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
    invalidateQueriesMock.mockReset();
    setThemeMock.mockReset();
    updateUserThemeMock.mockReset();
    updateReaderColorModeMock.mockReset();
    themeState.theme = "dark";
    themeState.resolvedTheme = "dark";
    invalidateQueriesMock.mockResolvedValue(undefined);
    updateUserThemeMock.mockResolvedValue({ success: true });
    updateReaderColorModeMock.mockResolvedValue({ success: true });
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

  function findSwitch() {
    const switchElement = container.querySelector('[role="switch"]');
    if (!switchElement) {
      throw new Error("Expected PDF reader color switch to be rendered.");
    }
    return switchElement;
  }

  it("reflects the reader color inverted prop in the switch", async () => {
    await act(async () => {
      root.render(<AppearanceCard readerColorInverted />);
    });

    expect(findSwitch().getAttribute("aria-checked")).toBe("true");
  });

  it("persists the reader color toggle to the server", async () => {
    await act(async () => {
      root.render(<AppearanceCard readerColorInverted={false} />);
    });

    await act(async () => {
      findSwitch().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(updateReaderColorModeMock).toHaveBeenCalledWith({ inverted: true });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ["account-settings"],
    });
  });

  it("rolls back the reader color toggle when the server action fails", async () => {
    await act(async () => {
      root.render(<AppearanceCard readerColorInverted={false} />);
    });

    updateReaderColorModeMock.mockResolvedValueOnce({
      success: false,
      errorCode: "account.readerColorMode.updateFailed",
    });

    await act(async () => {
      findSwitch().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(updateReaderColorModeMock).toHaveBeenCalledWith({ inverted: true });
    expect(findSwitch().getAttribute("aria-checked")).toBe("false");
  });
});
