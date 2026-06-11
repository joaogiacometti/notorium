/**
 * Clipboard image extraction shared by paste handlers (rich text editors and
 * mindmap nodes). Lives outside tiptap-helpers so non-TipTap consumers don't
 * pull TipTap into their bundle.
 */

/**
 * Return the first image file found in a paste event's clipboard, or null.
 *
 * @example
 * const file = getPastedImageFile(event);
 * if (file) void uploadImage(file);
 */
export function getPastedImageFile(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) {
    return null;
  }

  for (const item of Array.from(items)) {
    if (item.kind !== "file") {
      continue;
    }

    const file = item.getAsFile();
    if (!file) {
      continue;
    }

    if (!file.type.toLowerCase().startsWith("image/")) {
      continue;
    }

    return file;
  }

  return null;
}

/**
 * Upload file name for a pasted image. Clipboard images often have no name,
 * so fall back to one derived from the MIME type.
 *
 * @example
 * getPastedImageFileName(file); // "screenshot.png" or "pasted-image.png"
 */
export function getPastedImageFileName(file: File): string {
  const name = file.name.trim();
  if (name.length > 0) {
    return name;
  }

  const extension = file.type.split("/")[1] ?? "png";
  return `pasted-image.${extension}`;
}
