import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountProfileCard } from "@/components/account/account-profile-card";
import { libraryKeys } from "@/lib/client-cache/queries";

const { updateAccountMock, routerRefreshMock } = vi.hoisted(() => ({
  updateAccountMock: vi.fn(),
  routerRefreshMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/account", () => ({ updateAccount: updateAccountMock }));
vi.mock("@/lib/read-api/account", () => ({
  fetchAccountSettings: vi.fn(() => new Promise(() => {})),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllMocks();
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
});

it("refreshes the cached settings after a rename so reopening shows the new name", async () => {
  updateAccountMock.mockResolvedValueOnce({ success: true });
  const queryClient = new QueryClient();
  queryClient.setQueryData(libraryKeys.accountSettings, { name: "Ada" });

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <AccountProfileCard
          name="Ada"
          email="ada@example.com"
          memberSince="January 1, 2026"
        />
      </QueryClientProvider>,
    );
  });

  const input = container.querySelector<HTMLInputElement>("#form-account-name");
  if (!input) throw new Error("Display name input missing");
  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setValue?.call(input, "Grace");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    container
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });

  expect(updateAccountMock).toHaveBeenCalledWith({ name: "Grace" });
  expect(
    queryClient.getQueryState(libraryKeys.accountSettings)?.isInvalidated,
  ).toBe(true);
});

it("shows Save only after an edit and Cancel restores the saved name", async () => {
  await act(async () => {
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <AccountProfileCard
          name="Ada"
          email="ada@example.com"
          memberSince="January 1, 2026"
        />
      </QueryClientProvider>,
    );
  });

  const findButton = (label: string) =>
    Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === label,
    );
  const input = container.querySelector<HTMLInputElement>("#form-account-name");
  if (!input) throw new Error("Display name input missing");
  expect(findButton("Save")).toBeUndefined();
  expect(findButton("Cancel")).toBeUndefined();

  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(input, "Grace");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(findButton("Save")?.disabled).toBe(false);

  await act(async () => {
    findButton("Cancel")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
  });
  expect(input.value).toBe("Ada");
  expect(findButton("Save")).toBeUndefined();
  expect(updateAccountMock).not.toHaveBeenCalled();
});
