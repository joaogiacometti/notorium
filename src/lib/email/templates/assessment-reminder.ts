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
  // Notifications live in the settings dialog, not a route; the `?settings=`
  // deep link opens it on the notifications section from any app page.
  const accountUrl = `${appUrl}/planning?settings=notifications`;

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

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0 0 12px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;font-weight:700;">Notorium</p>
                <h1 style="margin:0;font-size:24px;line-height:1.25;color:#0f172a;">${count === 1 ? `&quot;${escapedFirstTitle}&quot; is coming up` : `${count} upcoming assessments`}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 0;font-size:15px;line-height:1.6;color:#334155;">
                <p style="margin:0 0 16px;">Hi ${escapedName},</p>
                <p style="margin:0 0 20px;">You have ${count === 1 ? "an upcoming assessment" : `${count} upcoming assessments`} due soon. Here&rsquo;s a quick summary:</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;border-collapse:collapse;">
                  <thead>
                    <tr style="background:#f8fafc;">
                      <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Assessment</th>
                      <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Subject</th>
                      <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows}
                  </tbody>
                </table>
                <p style="margin:24px 0;">
                  <a href="${planningUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:12px 18px;">View Planning Page</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 28px;font-size:12px;line-height:1.5;color:#64748b;">
                You&rsquo;re receiving this because you enabled assessment reminders in your Notorium account.
                You can turn them off in your <a href="${accountUrl}" style="color:#2563eb;">account settings</a>.
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
