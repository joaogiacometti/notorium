const ATTACHMENT_NAMESPACE = "notorium";
export const ATTACHMENT_CONTEXT_VALUES = [
  "notes",
  "flashcards",
  "assessments",
] as const;
const ATTACHMENT_CONTEXTS = new Set<string>(ATTACHMENT_CONTEXT_VALUES);

export type AttachmentContext = (typeof ATTACHMENT_CONTEXT_VALUES)[number];

export interface ParsedOwnedAttachmentPathname {
  pathname: string;
  ownerId: string;
  context: AttachmentContext;
  fileName: string;
}

export function parseOwnedAttachmentPathname(
  pathnameValue: string,
): ParsedOwnedAttachmentPathname | null {
  const pathname = pathnameValue.trim();

  if (
    pathname.length === 0 ||
    pathname.length > 512 ||
    pathname.includes("..")
  ) {
    return null;
  }

  const segments = pathname.split("/");

  if (segments.length !== 4) {
    return null;
  }

  const [namespace, context, ownerId, fileName] = segments;

  if (namespace !== ATTACHMENT_NAMESPACE) {
    return null;
  }

  if (!ATTACHMENT_CONTEXTS.has(context)) {
    return null;
  }

  if (ownerId.length === 0 || ownerId.length > 200) {
    return null;
  }

  if (fileName.length === 0 || fileName.length > 220) {
    return null;
  }

  return {
    pathname,
    ownerId,
    context: context as AttachmentContext,
    fileName,
  };
}

export function isOwnedAttachmentPathname(
  pathname: string,
  userId: string,
): boolean {
  const parsed = parseOwnedAttachmentPathname(pathname);

  if (!parsed) {
    return false;
  }

  return parsed.ownerId === userId;
}

export function getOwnedAttachmentPathnames(
  pathnames: string[],
  userId: string,
): string[] {
  return [...new Set(pathnames)].filter((pathname) =>
    isOwnedAttachmentPathname(pathname, userId),
  );
}
