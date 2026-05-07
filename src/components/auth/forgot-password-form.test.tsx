import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

const {
  requestPasswordResetActionMock,
  pushMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  requestPasswordResetActionMock: vi.fn(),
  pushMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/auth", () => ({
  requestPasswordResetAction: requestPasswordResetActionMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock("@/lib/server/server-action-errors", () => ({
  resolveActionErrorMessage: () => "Could not request password reset.",
}));

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("ForgotPasswordForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    requestPasswordResetActionMock.mockReset();
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("shows a toast and redirects to login after a successful request", async () => {
    requestPasswordResetActionMock.mockResolvedValueOnce({ success: true });

    await act(async () => {
      root.render(<ForgotPasswordForm />);
    });

    await act(async () => {
      setInputValue(
        container.querySelector(
          "#form-forgot-password-email",
        ) as HTMLInputElement,
        "alice@example.com",
      );
    });

    await act(async () => {
      container
        .querySelector("button[type='submit']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(requestPasswordResetActionMock).toHaveBeenCalledWith({
      email: "alice@example.com",
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "If your account is active, a reset email will be sent.",
    );
    expect(container.textContent).not.toContain(
      "If your account is active, a reset email will be sent.",
    );
    expect(pushMock).toHaveBeenCalledWith("/login");
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("renders recovery guidance and sign-in link", async () => {
    await act(async () => {
      root.render(<ForgotPasswordForm />);
    });

    expect(container.textContent).toContain("Forgot your password?");
    expect(container.textContent).toContain(
      "If your account is active, we'll send a reset link.",
    );
    expect(container.textContent).toContain(
      "this confirmation is generic and never reveals account status",
    );

    const signInLink = Array.from(container.querySelectorAll("a")).find(
      (element) => element.textContent === "Back to sign in",
    );

    expect(signInLink).toBeTruthy();
    expect(signInLink?.getAttribute("href")).toBe("/login");
  });

  it("shows an error toast and does not redirect when the action fails", async () => {
    requestPasswordResetActionMock.mockResolvedValueOnce({
      success: false,
      errorCode: "auth.passwordResetFailed",
    });

    await act(async () => {
      root.render(<ForgotPasswordForm />);
    });

    await act(async () => {
      setInputValue(
        container.querySelector(
          "#form-forgot-password-email",
        ) as HTMLInputElement,
        "alice@example.com",
      );
    });

    await act(async () => {
      container
        .querySelector("button[type='submit']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Could not request password reset.",
    );
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
