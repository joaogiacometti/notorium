import { describe, expect, it } from "vitest";
import {
  defaultThemeChromeColor,
  resolveThemeChromeColor,
  themeChromeColorById,
  validThemes,
} from "@/lib/theme";

describe("theme chrome colors", () => {
  it("defines a chrome color for every non-system app theme", () => {
    const nonSystemThemes = validThemes.filter((theme) => theme !== "system");

    expect(Object.keys(themeChromeColorById).sort()).toEqual(
      [...nonSystemThemes].sort(),
    );
    for (const theme of nonSystemThemes) {
      expect(themeChromeColorById[theme]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("resolves system themes through the current resolved theme", () => {
    expect(resolveThemeChromeColor("system", "dark")).toBe(
      themeChromeColorById.dark,
    );
  });

  it("uses the light chrome color for unknown or unresolved themes", () => {
    expect(resolveThemeChromeColor("system", undefined)).toBe(
      defaultThemeChromeColor,
    );
    expect(resolveThemeChromeColor("unknown", "halloween")).toBe(
      defaultThemeChromeColor,
    );
  });
});
