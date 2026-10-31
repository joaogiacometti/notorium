import type { PDFDocumentProxy } from "pdfjs-dist";
import { z } from "zod";

const pdfContentsTargetSchema = z
  .tuple([
    z.union([
      z.number().int().nonnegative(),
      z.object({
        num: z.number().int().nonnegative(),
        gen: z.number().int().nonnegative(),
      }),
    ]),
  ])
  .rest(z.unknown());

export async function resolvePdfContentsPage(
  pdfDocument: Pick<
    PDFDocumentProxy,
    "getDestination" | "getPageIndex" | "numPages"
  >,
  destination: unknown,
): Promise<number> {
  const explicitDestination: unknown =
    typeof destination === "string"
      ? await pdfDocument.getDestination(destination)
      : destination;
  const [target] = pdfContentsTargetSchema.parse(explicitDestination);
  const pageIndex =
    typeof target === "number"
      ? target
      : await pdfDocument.getPageIndex(target);
  return z
    .number()
    .int()
    .min(1)
    .max(pdfDocument.numPages)
    .parse(pageIndex + 1);
}
