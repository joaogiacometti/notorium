import { getMediaStorageProvider } from "@/lib/media-storage/provider";

function isOwnedAttachmentPathname(pathname: string, userId: string): boolean {
  return (
    pathname.startsWith(`notorium/notes/${userId}/`) ||
    pathname.startsWith(`notorium/flashcards/${userId}/`)
  );
}

export async function cleanupAttachmentPathnames(
  userId: string,
  pathnames: string[],
): Promise<void> {
  const ownedPathnames = [...new Set(pathnames)].filter((pathname) =>
    isOwnedAttachmentPathname(pathname, userId),
  );

  if (ownedPathnames.length === 0) {
    return;
  }

  const provider = await getMediaStorageProvider();

  if (!provider) {
    return;
  }

  try {
    await provider.deleteImages({ pathnames: ownedPathnames });
  } catch {}
}
