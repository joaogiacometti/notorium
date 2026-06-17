import { describe, expect, it } from "vitest";
import {
  resolveSettingsSection,
  settingsSections,
} from "@/components/account/settings-sections";

describe("resolveSettingsSection", () => {
  it("returns a known section unchanged", () => {
    for (const section of settingsSections) {
      expect(resolveSettingsSection(section.id)).toBe(section.id);
    }
  });

  it("falls back to account for unknown or missing values", () => {
    expect(resolveSettingsSection("bogus")).toBe("account");
    expect(resolveSettingsSection(null)).toBe("account");
    expect(resolveSettingsSection("")).toBe("account");
  });
});
