import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "secret123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects email longer than 254 characters", () => {
    const local = "a".repeat(245);
    const result = loginSchema.safeParse({
      email: `${local}@example.com`,
      password: "secret123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects password longer than 128 characters", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(129),
    });

    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("accepts valid signup data", () => {
    const result = signupSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "securepass",
      confirmPassword: "securepass",
    });

    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = signupSchema.safeParse({
      name: "A",
      email: "alice@example.com",
      password: "securepass",
      confirmPassword: "securepass",
    });

    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = signupSchema.safeParse({
      name: "a".repeat(101),
      email: "alice@example.com",
      password: "securepass",
      confirmPassword: "securepass",
    });

    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "securepass",
      confirmPassword: "differentpass",
    });

    expect(result.success).toBe(false);
  });

  it("reports password mismatch error on confirmPassword path", () => {
    const result = signupSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "securepass",
      confirmPassword: "wrong",
    });

    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("confirmPassword");
    }
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({
      name: "Alice",
      email: "not-valid",
      password: "securepass",
      confirmPassword: "securepass",
    });

    expect(result.success).toBe(false);
  });
});
