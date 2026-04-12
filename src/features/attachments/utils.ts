import { getInternalAttachmentPathnames } from "@/lib/editor/rich-text";

export function getRemovedAttachmentPathnames(
  previousValues: string[],
  nextValues: string[],
): string[] {
  const nextPathnames = new Set(
    nextValues.flatMap((value) => getInternalAttachmentPathnames(value)),
  );

  return [
    ...new Set(
      previousValues.flatMap((value) =>
        getInternalAttachmentPathnames(value).filter(
          (pathname) => !nextPathnames.has(pathname),
        ),
      ),
    ),
  ];
}
