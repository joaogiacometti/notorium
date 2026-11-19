import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NewCardsPerDayCard } from "@/components/account/new-cards-per-day-card";
import { libraryKeys } from "@/lib/client-cache/queries";

const { updateNewCardsPerDayMock } = vi.hoisted(() => ({
  updateNewCardsPerDayMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/account", () => ({
  updateNewCardsPerDay: updateNewCardsPerDayMock,
}));
vi.mock("@/lib/read-api/account", () => ({
  fetchAccountSettings: vi.fn(() => new Promise(() => {})),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

let container: HTMLDivElement;
let root: Root;
let queryClient: QueryClient;

async function renderCard(newCardsPerDay: number) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <NewCardsPerDayCard newCardsPerDay={newCardsPerDay} />
      </QueryClientProvider>,
    );
  });
}

function getInput() {
  const input = container.querySelector<HTMLInputElement>(
    "#form-new-cards-per-day-input",
  );
  if (!input) throw new Error("New cards per day input missing");
  return input;
}

async function typeValue(value: string) {
  const input = getInput();
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submit() {
  await act(async () => {
    container
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  queryClient = new QueryClient();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllMocks();
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
});

it("saves a new limit and refreshes the cached settings", async () => {
  updateNewCardsPerDayMock.mockResolvedValueOnce({ success: true });
  queryClient.setQueryData(libraryKeys.accountSettings, { newCardsPerDay: 20 });
  await renderCard(20);

  await typeValue("5");
  await submit();

  expect(updateNewCardsPerDayMock).toHaveBeenCalledExactlyOnceWith({
    newCardsPerDay: 5,
  });
  expect(
    queryClient.getQueryState(libraryKeys.accountSettings)?.isInvalidated,
  ).toBe(true);
});

it("accepts zero to pause new cards", async () => {
  updateNewCardsPerDayMock.mockResolvedValueOnce({ success: true });
  await renderCard(20);

  await typeValue("0");
  await submit();

  expect(updateNewCardsPerDayMock).toHaveBeenCalledWith({ newCardsPerDay: 0 });
});

it("rejects an empty or fractional limit without saving", async () => {
  await renderCard(20);

  for (const value of ["", "2.5"]) {
    await typeValue(value);
    await submit();
    expect(container.textContent).toContain("Enter a whole number from 0 to");
  }
  expect(updateNewCardsPerDayMock).not.toHaveBeenCalled();
});
