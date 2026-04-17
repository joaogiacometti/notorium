import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "@/components/navbar/logout-button";
import { themeStorageKey } from "@/lib/theme-storage";

const { logoutActionMock } = vi.hoisted(() => ({
  logoutActionMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function createStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

function createCookieStoreMock() {
  const store = new Map<string, string>();

  return {
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    get: vi.fn(async (key: string) => {
      const value = store.get(key);
      return value ? { name: key, value } : null;
    }),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

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
      value: createStorageMock(),
      configurable: true,
    });
    Object.defineProperty(globalThis, "cookieStore", {
      value: createCookieStoreMock(),
      configurable: true,
    });
    vi.spyOn(globalThis.location, "assign").mockImplementation(() => {});
    globalThis.localStorage.setItem(themeStorageKey, "dark");
    void globalThis.cookieStore.set(themeStorageKey, "dark");
    logoutActionMock.mockResolvedValue({ success: true });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    globalThis.localStorage.clear();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("clears the persisted theme preference before navigating to login", async () => {
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
    expect(globalThis.localStorage.getItem(themeStorageKey)).toBeNull();
    expect(globalThis.cookieStore.delete).toHaveBeenCalledWith(themeStorageKey);
    expect(globalThis.location.assign).toHaveBeenCalledWith("/login");
  });
});
