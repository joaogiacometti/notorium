/**
 * Escape text for safe use in HTML text and quoted attribute values.
 *
 * @example
 * `<p title="${escapeHtml(title)}">${escapeHtml(body)}</p>`;
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
