/**
 * A highlight as the reader consumes it. `annotation` is the EmbedPDF
 * `PdfAnnotationObject` (typed loosely here to avoid importing the reader-only
 * plugin types into server code); its `contents` field holds the note text and
 * its `created`/`modified` fields are revived to `Date` by the mappers.
 */
export interface BookAnnotationDto {
  uid: string;
  pageIndex: number;
  annotation: Record<string, unknown>;
}
