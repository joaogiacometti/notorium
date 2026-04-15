import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiSettingsCard } from "@/components/account/ai-settings-card";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const clearUserAiSettingsMock = vi.fn();
const updateUserAiSettingsMock = vi.fn();
const routerRefreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefreshMock,
  }),
}));

vi.mock("@/app/actions/account", () => ({
  clearUserAiSettings: () => clearUserAiSettingsMock(),
  updateUserAiSettings: (...args: unknown[]) =>
    updateUserAiSettingsMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/shared/async-button-content", () => ({
  AsyncButtonContent: ({
    pending,
    idleLabel,
    pendingLabel,
  }: {
    pending: boolean;
    idleLabel: string;
    pendingLabel: string;
  }) => <span>{pending ? pendingLabel : idleLabel}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
}));

vi.mock("@/components/ui/field", () => ({
  Field: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  FieldError: () => null,
  FieldGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldLabel: ({ children }: { children: ReactNode }) => (
    <label htmlFor="">{children}</label>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

describe("AiSettingsCard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    clearUserAiSettingsMock.mockReset();
    updateUserAiSettingsMock.mockReset();
    routerRefreshMock.mockReset();
    clearUserAiSettingsMock.mockResolvedValue({ success: true });
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("requires confirmation before clearing a saved key", async () => {
    await act(async () => {
      root.render(
        <AiSettingsCard
          initialAiSettings={{
            provider: "openrouter",
            model: "openai/gpt-4.1-mini",
            hasApiKey: true,
            apiKeyLastFour: "1234",
          }}
        />,
      );
    });

    const clearSavedKeyButton = Array.from(
      container.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Clear Saved Key")) as
      | HTMLButtonElement
      | undefined;

    expect(clearSavedKeyButton).toBeDefined();

    await act(async () => {
      clearSavedKeyButton?.click();
    });

    expect(clearUserAiSettingsMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Clear saved API key?");

    const confirmButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Clear Key"),
    ) as HTMLButtonElement | undefined;

    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton?.click();
    });

    expect(clearUserAiSettingsMock).toHaveBeenCalledTimes(1);
  });
});
