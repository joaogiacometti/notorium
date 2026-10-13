// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleAuthRedirect } from "@/components/auth/handle-auth-redirect";
import { stubWindowLocationAssign } from "@/test/fake-window-location";

describe("handle-auth-redirect", () => {
  beforeEach(() => {
    stubWindowLocationAssign();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("navigates for authenticated redirects", () => {
    handleAuthRedirect({
      success: true,
      data: {
        redirectTo: "/",
      },
    });

    expect(window.location.assign).toHaveBeenCalledWith("/");
  });

  it("navigates for pending-approval redirects", () => {
    handleAuthRedirect({
      success: true,
      data: {
        redirectTo: "/login?pendingApproval=1",
      },
    });

    expect(window.location.assign).toHaveBeenCalledWith(
      "/login?pendingApproval=1",
    );
  });
});
