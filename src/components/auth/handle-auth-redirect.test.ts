import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleAuthRedirect } from "@/components/auth/handle-auth-redirect";

describe("handle-auth-redirect", () => {
  beforeEach(() => {
    vi.spyOn(window.location, "assign").mockImplementation(() => {});
  });

  it("navigates for authenticated redirects", () => {
    handleAuthRedirect({
      success: true,
      data: {
        redirectTo: "/subjects",
      },
    });

    expect(window.location.assign).toHaveBeenCalledWith("/subjects");
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
