import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { pwaLaunchBackgroundColor } from "@/lib/theme";

describe("manifest", () => {
  it("uses the static PWA launch background color", () => {
    const webManifest = manifest();

    expect(webManifest.background_color).toBe(pwaLaunchBackgroundColor);
    expect(webManifest.theme_color).toBe(pwaLaunchBackgroundColor);
    expect(webManifest.display).toBe("standalone");
    expect(webManifest.icons).toHaveLength(2);
  });
});
