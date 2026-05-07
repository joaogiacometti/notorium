import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";

const { loginActionMock, toastErrorMock } = vi.hoisted(() => ({
  loginActionMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/auth", () => ({
  loginAction: loginActionMock,
}));

vi.mock("next/navigation", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

function queryByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("*")).find(
    (element) => element.textContent === text,
  );
}

function queryByAriaLabel(container: HTMLElement, label: string) {
  return container.querySelector(`[aria-label="${label}"]`);
}

function queryLinkByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("a")).find(
    (element) => element.textContent === text,
  );
}

describe("LoginForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    loginActionMock.mockReset();
    toastErrorMock.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("renders the pending approval notice when requested", async () => {
    await act(async () => {
      root.render(<LoginForm showPendingApprovalNotice />);
    });

    expect(
      queryByText(container, "Account created successfully."),
    ).toBeTruthy();
    expect(
      queryByText(
        container,
        "Your access now waits for administrator approval.",
      ),
    ).toBeTruthy();
  });

  it("omits the pending approval notice by default", async () => {
    await act(async () => {
      root.render(<LoginForm />);
    });

    expect(
      queryByText(container, "Account created successfully."),
    ).toBeUndefined();
  });

  it("hides the password reset link by default", async () => {
    await act(async () => {
      root.render(<LoginForm />);
    });

    expect(queryByText(container, "Forgot password?")).toBeUndefined();
  });

  it("shows the password reset link when enabled", async () => {
    await act(async () => {
      root.render(<LoginForm showForgotPasswordLink />);
    });

    const link = queryLinkByText(container, "Forgot password?");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/forgot-password");
    expect(link?.className).toContain("text-foreground/90");
    expect(link?.className).toContain("hover:underline");
    expect(link?.className).toContain("focus-visible:ring-2");
  });

  it("renders password input without a custom reveal button", async () => {
    await act(async () => {
      root.render(<LoginForm />);
    });

    const input = container.querySelector(
      "#form-login-password",
    ) as HTMLInputElement;

    expect(input.type).toBe("password");
    expect(queryByAriaLabel(container, "Show password")).toBeNull();
    expect(queryByAriaLabel(container, "Hide password")).toBeNull();
  });

  it("shows caps lock hint while key event indicates caps lock", async () => {
    await act(async () => {
      root.render(<LoginForm />);
    });

    const passwordInput = container.querySelector(
      "#form-login-password",
    ) as HTMLInputElement;
    await act(async () => {
      const event = new KeyboardEvent("keydown", { key: "A", bubbles: true });
      Object.defineProperty(event, "getModifierState", {
        value: (key: string) => key === "CapsLock",
      });
      passwordInput.dispatchEvent(event);
    });

    expect(queryByText(container, "Caps Lock is on.")).toBeTruthy();
  });
});
