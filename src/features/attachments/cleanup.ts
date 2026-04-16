import { getOwnedAttachmentPathnames } from "@/features/attachments/pathname";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";

export async function cleanupAttachmentPathnames(
  userId: string,
  pathnames: string[],
): Promise<void> {
  const ownedPathnames = getOwnedAttachmentPathnames(pathnames, userId);

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
