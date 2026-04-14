import "server-only";
import { getServerEnv } from "@/env";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<SendEmailResult> {
  const env = getServerEnv();

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
