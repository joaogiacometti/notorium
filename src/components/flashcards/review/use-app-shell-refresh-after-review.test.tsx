import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppShellRefreshAfterReview } from "@/components/flashcards/review/use-app-shell-refresh-after-review";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

interface RefreshProbeProps {
  pendingReviewWriteCount: number;
}

// Counts `router.refresh()` calls in place of the Next.js App Router.
class FakeAppRouter {
  refreshCount = 0;
  refresh = (): void => {
    this.refreshCount += 1;
  };
}

const fakeRouter = vi.hoisted(() => ({
  current: null as null | FakeAppRouter,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => fakeRouter.current,
}));

function RefreshProbe({
  pendingReviewWriteCount,
}: Readonly<RefreshProbeProps>) {
  useAppShellRefreshAfterReview(pendingReviewWriteCount);
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
    root = createRoot(document.createElement("div"));
  });

  it("does not refresh while the session is still mounted", () => {
    renderProbe({ pendingReviewWriteCount: 1 });
    renderProbe({ pendingReviewWriteCount: 0 });

    expect(router.refreshCount).toBe(0);
    act(() => root.unmount());
  });

  it("refreshes once on unmount after a review write", () => {
    renderProbe({ pendingReviewWriteCount: 1 });
    renderProbe({ pendingReviewWriteCount: 0 });

    act(() => root.unmount());

    expect(router.refreshCount).toBe(1);
  });

  it("does not refresh on unmount when nothing was graded", () => {
    renderProbe({ pendingReviewWriteCount: 0 });

    act(() => root.unmount());

    expect(router.refreshCount).toBe(0);
  });
});
