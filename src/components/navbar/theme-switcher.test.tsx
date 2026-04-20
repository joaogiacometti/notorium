import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModeToggle } from "@/components/navbar/theme-switcher";

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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  ),
}));

function findElementByExactText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("*")).find(
    (element) => element.textContent?.trim() === text,
  );
}

describe("ModeToggle", () => {
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

  it("renders an icon-only navbar trigger with accessible label", async () => {
    await act(async () => {
      root.render(<ModeToggle variant="navbar" />);
    });

    const trigger = container.querySelector(
      '[data-testid="theme-switcher-navbar-trigger"]',
    );

    expect(trigger).toBeTruthy();
    expect(trigger?.textContent).toContain("Change theme");
    expect(trigger?.textContent).not.toContain("Theme");
  });

  it("keeps floating trigger selector stable", async () => {
    await act(async () => {
      root.render(<ModeToggle variant="floating" syncWithServer={false} />);
    });

    const floatingTrigger = container.querySelector(
      '[data-testid="theme-switcher-floating-trigger"]',
    );

    expect(floatingTrigger).toBeTruthy();
  });

  it("marks the current theme option as selected", async () => {
    themeState.theme = "dark";

    await act(async () => {
      root.render(<ModeToggle />);
    });

    const darkLabel = findElementByExactText(container, "Dark");
    const darkItem = darkLabel?.closest('[role="menuitem"]');

    expect(darkItem).toBeTruthy();
    expect(darkItem?.className).toContain("bg-accent/65");
  });

  it("reverts local theme when persistence fails", async () => {
    updateUserThemeMock.mockResolvedValue({
      success: false,
      error: "theme.saveFailed",
    });

    await act(async () => {
      root.render(<ModeToggle />);
    });

    const lightLabel = findElementByExactText(container, "Light");
    const lightItem = lightLabel?.closest('[role="menuitem"]');

    expect(lightItem).toBeTruthy();

    await act(async () => {
      lightItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(setThemeMock).toHaveBeenNthCalledWith(1, "light");
    expect(setThemeMock).toHaveBeenNthCalledWith(2, "dark");
    expect(updateUserThemeMock).toHaveBeenCalledWith({ theme: "light" });
  });

  it("does not sync the theme to the server when disabled", async () => {
    await act(async () => {
      root.render(<ModeToggle variant="floating" syncWithServer={false} />);
    });

    const lightLabel = findElementByExactText(container, "Light");
    const lightItem = lightLabel?.closest('[role="menuitem"]');

    expect(lightItem).toBeTruthy();

    await act(async () => {
      lightItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(setThemeMock).toHaveBeenCalledOnce();
    expect(setThemeMock).toHaveBeenCalledWith("light");
    expect(updateUserThemeMock).not.toHaveBeenCalled();
  });
});
