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
        theme: "catppuccin-mocha",
      },
    });

    expect(window.location.assign).toHaveBeenCalledWith("/subjects");
  });

  it("navigates even when a theme is included in the payload", () => {
    handleAuthRedirect({
      success: true,
      data: {
        redirectTo: "/subjects",
        theme: "dark",
      },
    });

    expect(window.location.assign).toHaveBeenCalledWith("/subjects");
  });

  it("navigates when no theme is provided", () => {
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
