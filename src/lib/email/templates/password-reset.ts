export function renderPasswordResetEmail({
  userName,
  resetUrl,
}: {
  userName: string;
  resetUrl: string;
}) {
  const safeName = escapeHtml(userName);
  const safeResetUrl = escapeHtml(resetUrl);

  return {
    subject: "Reset your Notorium password",
    html: `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0 0 12px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;font-weight:700;">Notorium</p>
                <h1 style="margin:0;font-size:24px;line-height:1.25;color:#0f172a;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 0;font-size:15px;line-height:1.6;color:#334155;">
                <p style="margin:0 0 16px;">Hi ${safeName},</p>
                <p style="margin:0 0 20px;">Use the button below to set a new password. This link expires in 1 hour.</p>
                <p style="margin:0 0 24px;">
                  <a href="${safeResetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:12px 18px;">Reset password</a>
                </p>
                <p style="margin:0 0 8px;">If you did not request this, you can ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 28px;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;">
                ${safeResetUrl}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}
