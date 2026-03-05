import { describe, expect, it } from "vitest";
import {
  accessStatusSchema,
  updateUserAccessSchema,
} from "@/lib/validations/access-control";

describe("accessStatusSchema", () => {
  it("accepts pending, approved, and blocked", () => {
    expect(accessStatusSchema.safeParse("pending").success).toBe(true);
    expect(accessStatusSchema.safeParse("approved").success).toBe(true);
    expect(accessStatusSchema.safeParse("blocked").success).toBe(true);
  });

  it("rejects unsupported status values", () => {
    const result = accessStatusSchema.safeParse("disabled");

    expect(result.success).toBe(false);
  });
});

describe("updateUserAccessSchema", () => {
  it("accepts valid update payload", () => {
    const result = updateUserAccessSchema.safeParse({
      userId: "user-id-1",
      accessStatus: "approved",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty userId", () => {
    const result = updateUserAccessSchema.safeParse({
      userId: "",
      accessStatus: "pending",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = updateUserAccessSchema.safeParse({
      userId: "user-id-1",
      accessStatus: "unknown",
    });

    expect(result.success).toBe(false);
  });
});
