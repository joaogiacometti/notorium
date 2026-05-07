import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/components/auth/signup-form";

const { signUpActionMock, toastErrorMock } = vi.hoisted(() => ({
  signUpActionMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/auth", () => ({
  signUpAction: signUpActionMock,
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

describe("SignupForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    signUpActionMock.mockReset();
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

  it("renders password requirement helper text", async () => {
    await act(async () => {
      root.render(<SignupForm />);
    });

    expect(queryByText(container, "Use 8 to 128 characters.")).toBeTruthy();
  });

  it("renders password input without a custom reveal button", async () => {
    await act(async () => {
      root.render(<SignupForm />);
    });

    const input = container.querySelector(
      "#form-signup-password",
    ) as HTMLInputElement;

    expect(input.type).toBe("password");
    expect(queryByAriaLabel(container, "Show password")).toBeNull();
    expect(queryByAriaLabel(container, "Hide password")).toBeNull();
  });

  it("shows caps lock hint on signup password fields", async () => {
    await act(async () => {
      root.render(<SignupForm />);
    });

    const passwordInput = container.querySelector(
      "#form-signup-password",
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
