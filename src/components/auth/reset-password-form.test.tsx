import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

const { resetPasswordActionMock, pushMock, toastErrorMock, toastSuccessMock } =
  vi.hoisted(() => ({
    resetPasswordActionMock: vi.fn(),
    pushMock: vi.fn(),
    toastErrorMock: vi.fn(),
    toastSuccessMock: vi.fn(),
  }));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/auth", () => ({
  resetPasswordAction: resetPasswordActionMock,
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
  resolveActionErrorMessage: () => "Could not reset password.",
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

describe("ResetPasswordForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    resetPasswordActionMock.mockReset();
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

  it("shows a toast and redirects to login after a successful reset", async () => {
    resetPasswordActionMock.mockResolvedValueOnce({ success: true });

    await act(async () => {
      root.render(<ResetPasswordForm token="token-1" />);
    });

    await fillPasswordFields("securepass");
    await submitForm();

    expect(resetPasswordActionMock).toHaveBeenCalledWith({
      token: "token-1",
      password: "securepass",
      confirmPassword: "securepass",
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Password reset. You can sign in now.",
    );
    expect(container.textContent).not.toContain(
      "Password reset. You can sign in now.",
    );
    expect(pushMock).toHaveBeenCalledWith("/login");
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("shows an error toast and does not redirect when the action fails", async () => {
    resetPasswordActionMock.mockResolvedValueOnce({
      success: false,
      errorCode: "auth.passwordResetFailed",
    });

    await act(async () => {
      root.render(<ResetPasswordForm token="token-1" />);
    });

    await fillPasswordFields("securepass");
    await submitForm();

    expect(toastErrorMock).toHaveBeenCalledWith("Could not reset password.");
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("renders password inputs without custom reveal buttons", async () => {
    await act(async () => {
      root.render(<ResetPasswordForm token="token-1" />);
    });

    const passwordInput = container.querySelector(
      "#form-reset-password-password",
    ) as HTMLInputElement;
    const confirmPasswordInput = container.querySelector(
      "#form-reset-password-confirm-password",
    ) as HTMLInputElement;

    expect(passwordInput.type).toBe("password");
    expect(confirmPasswordInput.type).toBe("password");
    expect(container.querySelector('[aria-label="Show password"]')).toBeNull();
    expect(container.querySelector('[aria-label="Hide password"]')).toBeNull();
  });

  it("shows caps lock hint while typing a new password", async () => {
    await act(async () => {
      root.render(<ResetPasswordForm token="token-1" />);
    });

    const passwordInput = container.querySelector(
      "#form-reset-password-password",
    ) as HTMLInputElement;

    await act(async () => {
      const event = new KeyboardEvent("keydown", { key: "A", bubbles: true });
      Object.defineProperty(event, "getModifierState", {
        value: (key: string) => key === "CapsLock",
      });
      passwordInput.dispatchEvent(event);
    });

    expect(container.textContent).toContain("Caps Lock is on.");
  });

  async function fillPasswordFields(password: string) {
    await act(async () => {
      setInputValue(
        container.querySelector(
          "#form-reset-password-password",
        ) as HTMLInputElement,
        password,
      );
      setInputValue(
        container.querySelector(
          "#form-reset-password-confirm-password",
        ) as HTMLInputElement,
        password,
      );
    });
  }

  async function submitForm() {
    await act(async () => {
      container
        .querySelector("button[type='submit']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }
});
