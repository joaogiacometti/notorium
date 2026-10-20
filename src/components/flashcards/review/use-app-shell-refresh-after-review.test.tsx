import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppShellRefreshAfterReview } from "@/components/flashcards/review/use-app-shell-refresh-after-review";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

interface RefreshProbeProps {
  isFocusMode: boolean;
  pendingReviewWriteCount: number;
}

// Counts `router.refresh()` calls in place of the Next.js App Router.
class FakeAppRouter {
  refreshCount = 0;
  refresh = (): void => {
    this.refreshCount += 1;
  };
}

// Counts settle notifications handed to the review controller.
const settledLog = {
  count: 0,
  record: () => {
    settledLog.count += 1;
  },
};

const fakeRouter = vi.hoisted(() => ({
  current: null as null | FakeAppRouter,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => fakeRouter.current,
}));

function RefreshProbe({
  isFocusMode,
  pendingReviewWriteCount,
}: Readonly<RefreshProbeProps>) {
  useAppShellRefreshAfterReview(
    isFocusMode,
    pendingReviewWriteCount,
    settledLog.record,
  );
  return null;
}

describe("useAppShellRefreshAfterReview", () => {
  let root: Root;
  let router: FakeAppRouter;

  function renderProbe(props: RefreshProbeProps) {
    act(() => root.render(<RefreshProbe {...props} />));
  }

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    router = new FakeAppRouter();
    fakeRouter.current = router;
    settledLog.count = 0;
    root = createRoot(document.createElement("div"));
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it("refreshes once after focus mode closes with every grade saved", () => {
    renderProbe({ isFocusMode: true, pendingReviewWriteCount: 0 });
    renderProbe({ isFocusMode: true, pendingReviewWriteCount: 2 });
    renderProbe({ isFocusMode: true, pendingReviewWriteCount: 0 });
    expect(router.refreshCount).toBe(0);

    renderProbe({ isFocusMode: false, pendingReviewWriteCount: 0 });
    renderProbe({ isFocusMode: true, pendingReviewWriteCount: 0 });
    renderProbe({ isFocusMode: false, pendingReviewWriteCount: 0 });

    expect(router.refreshCount).toBe(1);
  });

  it("waits for in-flight grades before refreshing outside focus mode", () => {
    renderProbe({ isFocusMode: false, pendingReviewWriteCount: 1 });
    expect(router.refreshCount).toBe(0);

    renderProbe({ isFocusMode: false, pendingReviewWriteCount: 0 });

    expect(router.refreshCount).toBe(1);
    expect(settledLog.count).toBe(1);
  });

  it("does not refresh when nothing was graded", () => {
    renderProbe({ isFocusMode: true, pendingReviewWriteCount: 0 });
    renderProbe({ isFocusMode: false, pendingReviewWriteCount: 0 });

    expect(router.refreshCount).toBe(0);
    expect(settledLog.count).toBe(0);
  });

  it("refreshes on unmount when graded cards were never synced", () => {
    renderProbe({ isFocusMode: true, pendingReviewWriteCount: 1 });
    renderProbe({ isFocusMode: true, pendingReviewWriteCount: 0 });

    act(() => root.unmount());
    root = createRoot(document.createElement("div"));

    expect(router.refreshCount).toBe(1);
  });
});
