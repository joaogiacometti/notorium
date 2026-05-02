import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SyncStatusDot } from "@/components/shared/sync-status-dot";
import type { SyncIndicatorStatus } from "@/lib/sync-status";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe("SyncStatusDot", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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

  it.each([
    ["ready", "Ready offline"],
    ["syncing", "Syncing"],
    ["pending", "3 pending sync"],
    ["error", "Sync failed"],
    ["offline", "Offline"],
  ] satisfies [
    SyncIndicatorStatus,
    string,
  ][])("labels %s status", async (status, expectedLabel) => {
    await act(async () => {
      root.render(<SyncStatusDot status={status} pendingCount={3} />);
    });

    expect(
      container.querySelector(`[aria-label="${expectedLabel}"]`),
    ).toBeTruthy();
  });

  it("keeps the tooltip label out of visible content", async () => {
    await act(async () => {
      root.render(<SyncStatusDot status="ready" />);
    });

    expect(container.textContent).toBe("");
  });
});
