import { describe, expect, it } from "vitest";
import { renderPasswordResetEmail } from "@/lib/email/templates/password-reset";

describe("renderPasswordResetEmail", () => {
  it("renders the Notorium email shell with reset content", () => {
    const { subject, html } = renderPasswordResetEmail({
      userName: "Alice",
      resetUrl: "https://app.example.com/reset-password?token=abc123",
    });

    expect(subject).toBe("Reset your Notorium password");
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toContain("<html>");
    expect(html).toContain("background:#f8fafc");
    expect(html).toContain("font-family:Arial,sans-serif");
    expect(html).toContain("Notorium");
    expect(html).toContain("max-width:560px;background:#ffffff");
    expect(html).toContain("border:1px solid #e2e8f0");
    expect(html).toContain("color:#2563eb");
    expect(html).toContain("Hi Alice,");
    expect(html).toContain("This link expires in 1 hour.");
    expect(html).toContain(">Reset password</a>");
    expect(html).toContain("background:#2563eb");
    expect(html).toContain(
      'href="https://app.example.com/reset-password?token=abc123"',
    );
    expect(html).toContain(
      "https://app.example.com/reset-password?token=abc123",
    );
    expect(html).toContain("If you did not request this");
  });

  it("escapes user-controlled strings", () => {
    const { html } = renderPasswordResetEmail({
      userName: '<script>alert("xss")</script>',
      resetUrl: "https://app.example.com/reset?token=<bad>\"&name=O'Malley",
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<bad>");
    expect(html).not.toContain("\"&name=O'Malley");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;bad&gt;&quot;&amp;name=O&#x27;Malley");
  });
});
