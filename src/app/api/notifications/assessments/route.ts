import { NextResponse } from "next/server";
import { getServerEnv } from "@/env";
import { sendAssessmentReminderEmails } from "@/features/notifications/email-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const env = getServerEnv();

  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Cron endpoint is not configured." },
      { status: 503 },
    );
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return NextResponse.json(
      { error: "Email notifications are not configured." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await sendAssessmentReminderEmails();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to send assessment reminder emails:", error);
    return NextResponse.json(
      { error: "Internal error while sending notifications." },
      { status: 500 },
    );
  }
}
