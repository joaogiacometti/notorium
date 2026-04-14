import { describe, expect, it } from "vitest";
import {
  notificationDaysBeforeValues,
  updateNotificationPreferencesSchema,
} from "@/features/notifications/validation";

describe("updateNotificationPreferencesSchema", () => {
  it("accepts enabled=true with each valid daysBefore value", () => {
    for (const days of notificationDaysBeforeValues) {
      const result = updateNotificationPreferencesSchema.safeParse({
        notificationsEnabled: true,
        notificationDaysBefore: days,
      });

      expect(result.success, `should accept daysBefore="${days}"`).toBe(true);
    }
  });

  it("accepts enabled=false with any valid daysBefore value", () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      notificationsEnabled: false,
      notificationDaysBefore: "1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notificationsEnabled).toBe(false);
    }
  });

  it("rejects missing notificationsEnabled", () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      notificationDaysBefore: "1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing notificationDaysBefore", () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      notificationsEnabled: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid daysBefore values", () => {
    const invalid = ["0", "2", "5", "14", "30", "", "one", null, 1];

    for (const value of invalid) {
      const result = updateNotificationPreferencesSchema.safeParse({
        notificationsEnabled: true,
        notificationDaysBefore: value,
      });

      expect(
        result.success,
        `should reject daysBefore=${JSON.stringify(value)}`,
      ).toBe(false);
    }
  });

  it("rejects non-boolean notificationsEnabled", () => {
    const invalid = ["true", 1, 0, null, undefined];

    for (const value of invalid) {
      const result = updateNotificationPreferencesSchema.safeParse({
        notificationsEnabled: value,
        notificationDaysBefore: "1",
      });

      expect(
        result.success,
        `should reject notificationsEnabled=${JSON.stringify(value)}`,
      ).toBe(false);
    }
  });

  it("preserves parsed types", () => {
    const result = updateNotificationPreferencesSchema.safeParse({
      notificationsEnabled: true,
      notificationDaysBefore: "7",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.notificationsEnabled).toBe("boolean");
      expect(result.data.notificationDaysBefore).toBe("7");
    }
  });
});
