import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import { themeStorageKey } from "@/lib/theme-storage";

const { deleteAccountMock, toastErrorMock } = vi.hoisted(() => ({
  deleteAccountMock: vi.fn(),
  toastErrorMock: vi.fn(),
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

vi.mock("@/app/actions/account", () => ({
  deleteAccount: deleteAccountMock,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/components/shared/async-button-content", () => ({
  AsyncButtonContent: ({
    idleLabel,
  }: {
    idleLabel: string;
    pending: boolean;
    pendingLabel: string;
  }) => idleLabel,
}));

vi.mock("@/lib/server/server-action-errors", () => ({
  resolveActionErrorMessage: () => "Failed to delete account.",
}));

describe("DeleteAccountDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    Object.defineProperty(window, "localStorage", {
      value: createStorageMock(),
      configurable: true,
    });
    Object.defineProperty(window, "cookieStore", {
      value: createCookieStoreMock(),
      configurable: true,
    });
    vi.spyOn(window.location, "assign").mockImplementation(() => {});
    window.localStorage.setItem(themeStorageKey, "halloween");
    void window.cookieStore.set(themeStorageKey, "halloween");
    toastErrorMock.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    window.localStorage.clear();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("clears the persisted theme preference after a successful deletion", async () => {
    deleteAccountMock.mockResolvedValue({ success: true });

    await act(async () => {
      root.render(<DeleteAccountDialog open onOpenChange={vi.fn()} />);
    });

    const button = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent === "Delete Account",
    );

    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(deleteAccountMock).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem(themeStorageKey)).toBeNull();
    expect(window.cookieStore.delete).toHaveBeenCalledWith(themeStorageKey);
    expect(window.location.assign).toHaveBeenCalledWith("/login");
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("preserves the persisted theme preference when deletion fails", async () => {
    deleteAccountMock.mockResolvedValue({
      success: false,
      errorCode: "account.deleteFailed",
    });

    await act(async () => {
      root.render(<DeleteAccountDialog open onOpenChange={vi.fn()} />);
    });

    const button = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent === "Delete Account",
    );

    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(deleteAccountMock).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem(themeStorageKey)).toBe("halloween");
    expect(window.cookieStore.delete).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to delete account.");
  });
});
