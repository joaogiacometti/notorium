import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TimeZoneCard } from "@/components/account/time-zone-card";

const { updateTimeZoneMock } = vi.hoisted(() => ({
  updateTimeZoneMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/account", () => ({
  updateTimeZone: updateTimeZoneMock,
}));
vi.mock("@/lib/read-api/account", () => ({
  fetchAccountSettings: vi.fn(() => new Promise(() => {})),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const options = ["UTC", "America/Sao_Paulo", "Asia/Tokyo"];
let container: HTMLDivElement;
let root: Root;

function setDeviceZone(timeZone: string) {
  const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(
    function (this: Intl.DateTimeFormat) {
      return { ...resolvedOptions.call(this), timeZone };
    },
  );
}

async function renderCard(timeZone: string) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <TimeZoneCard timeZone={timeZone} options={options} />
      </QueryClientProvider>,
    );
  });
}

function findButton(label: string) {
  return Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === label,
  );
}

beforeEach(() => {
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
});

it("offers the device time zone when it differs from the saved one", async () => {
  updateTimeZoneMock.mockResolvedValueOnce({ success: true });
  setDeviceZone("America/Sao_Paulo");
  await renderCard("UTC");

  await act(async () => {
    findButton("Use device time zone (America/Sao Paulo)")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
  });

  expect(updateTimeZoneMock).toHaveBeenCalledExactlyOnceWith(
    "America/Sao_Paulo",
  );
});

it("does not offer the device time zone once it is saved", async () => {
  setDeviceZone("Asia/Tokyo");
  await renderCard("Asia/Tokyo");

  expect(container.textContent?.includes("Use device time zone")).toBe(false);
});

it("does not offer a device time zone outside the supported list", async () => {
  setDeviceZone("Mars/Olympus");
  await renderCard("UTC");

  expect(container.textContent?.includes("Use device time zone")).toBe(false);
});
