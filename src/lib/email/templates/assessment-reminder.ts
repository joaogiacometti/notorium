import { assessmentTypeLabels } from "@/features/assessments/assessments";

export interface AssessmentReminderItem {
  title: string;
  subjectName: string;
  dueDate: string;
  type: keyof typeof assessmentTypeLabels;
}

export interface AssessmentReminderData {
  userName: string;
  assessments: [AssessmentReminderItem, ...AssessmentReminderItem[]];
  appUrl: string;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

function formatDueDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function renderAssessmentReminderEmail({
  userName,
  assessments,
  appUrl,
}: AssessmentReminderData): { subject: string; html: string } {
  const count = assessments.length;
  const planningUrl = `${appUrl}/planning`;
  const accountUrl = `${appUrl}/account`;

  const escapedFirstTitle = escapeHtml(assessments[0].title);
  const subject =
    count === 1
      ? `Reminder: "${assessments[0].title}" is coming up`
      : `Reminder: ${count} upcoming assessments`;

  const rows = assessments
    .map(
      (a) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
          <strong style="color:#111827;">${escapeHtml(a.title)}</strong>
          <span style="display:inline-block;margin-left:8px;padding:1px 8px;border-radius:9999px;font-size:11px;background:#f3f4f6;color:#6b7280;">${assessmentTypeLabels[a.type]}</span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">${escapeHtml(a.subjectName)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#374151;white-space:nowrap;">${formatDueDate(a.dueDate)}</td>
      </tr>`,
    )
    .join("");

  const escapedName = escapeHtml(userName);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${count === 1 ? `Reminder: &quot;${escapedFirstTitle}&quot; is coming up` : `Reminder: ${count} upcoming assessments`}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:28px 32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Notorium</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Hi ${escapedName},</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
                You have ${count === 1 ? "an upcoming assessment" : `${count} upcoming assessments`} due soon. Here&rsquo;s a quick summary:
              </p>

              <!-- Assessments table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;border-collapse:collapse;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Assessment</th>
                    <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Subject</th>
                    <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td>
                    <a href="${planningUrl}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
                      View Planning Page
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You&rsquo;re receiving this because you enabled assessment reminders in your Notorium account.
                You can turn them off in your <a href="${accountUrl}" style="color:#6b7280;">account settings</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
