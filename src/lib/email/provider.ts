import "server-only";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getServerEnv } from "@/env";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

const defaultFixtureInboxPath = "test-results/email-fixture-inbox.jsonl";

async function sendFixtureEmail(
  options: SendEmailOptions,
  inboxPath = defaultFixtureInboxPath,
): Promise<SendEmailResult> {
  const resolvedInboxPath = path.resolve(inboxPath);
  await mkdir(path.dirname(resolvedInboxPath), { recursive: true });

  const id = `fixture-email-${randomUUID()}`;
  const payload = {
    id,
    sentAt: new Date().toISOString(),
    ...options,
  };

  await appendFile(resolvedInboxPath, `${JSON.stringify(payload)}\n`, "utf8");
  return { success: true, id };
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<SendEmailResult> {
  const env = getServerEnv();

  if (env.NOTORIUM_EMAIL_FIXTURE_MODE === "playwright") {
    return sendFixtureEmail(
      { to, subject, html },
      env.NOTORIUM_EMAIL_FIXTURE_INBOX_PATH,
    );
  }

  if (!env.RESEND_API_KEY) {
    return { success: false, error: "Email provider not configured." };
  }

  if (!env.RESEND_FROM_EMAIL) {
    return { success: false, error: "RESEND_FROM_EMAIL is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    return {
      success: false,
      error: `Email send failed: ${response.status}`,
    };
  }

  const data = (await response.json()) as { id: string };
  return { success: true, id: data.id };
}
