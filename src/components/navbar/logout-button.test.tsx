import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "@/components/navbar/logout-button";
import { themeStorageKey } from "@/lib/theme";

const { logoutActionMock } = vi.hoisted(() => ({
  logoutActionMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/auth", () => ({
  logoutAction: logoutActionMock,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <div
      role="menuitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onClick?.();
        }
      }}
    >
      {children}
    </div>
  ),
}));

describe("LogoutButton", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: vi.fn((key: string) =>
          key === themeStorageKey ? "dark" : null,
        ),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      configurable: true,
    });
    vi.spyOn(globalThis.location, "assign").mockImplementation(() => {});
    logoutActionMock.mockResolvedValue({ success: true });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("clears the stored theme and navigates to login after a successful logout", async () => {
    await act(async () => {
      root.render(<LogoutButton />);
    });

    const button = container.querySelector(
      '[data-testid="account-menu-logout"]',
    );

    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(logoutActionMock).toHaveBeenCalledOnce();
    expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith(
      themeStorageKey,
    );
    expect(globalThis.location.assign).toHaveBeenCalledWith("/login");
  });
});
