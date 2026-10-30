/**
 * Builds a valid PDF with `pageCount` blank Letter pages, small enough to
 * upload in a single request.
 *
 * @example await input.setInputFiles({ name: "book.pdf", mimeType: "application/pdf", buffer: buildBlankPdf(3) });
 */
export function buildBlankPdf(pageCount: number): Buffer {
  const pageIds = Array.from({ length: pageCount }, (_, index) => index + 3);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`,
    ...pageIds.map(
      () => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
    ),
  ];
  return Buffer.from(serializePdf(objects), "latin1");
}

function serializePdf(objects: string[]): string {
  let body = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = body.length;
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xrefOffset = body.length;
  const xrefRows = offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  return `${body}xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${xrefRows}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
}
