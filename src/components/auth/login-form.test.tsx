import { act } from "react";
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
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
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
      queryByText(
        container,
        "Your account was created successfully and is now waiting for administrator approval.",
      ),
    ).toBeTruthy();
  });

  it("omits the pending approval notice by default", async () => {
    await act(async () => {
      root.render(<LoginForm />);
    });

    expect(
      queryByText(
        container,
        "Your account was created successfully and is now waiting for administrator approval.",
      ),
    ).toBeUndefined();
  });
});
