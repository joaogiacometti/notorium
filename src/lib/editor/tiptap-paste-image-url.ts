import {
  isSupportedSharedImageUrl,
  resolveEmbeddableImageUrl,
  resolveSharedEmbeddableImageUrl,
} from "@/lib/editor/tiptap-image-url";

export type PastedImageResolution =
  | {
      handled: false;
      imageUrl: null;
      fallbackText: null;
    }
  | {
      handled: true;
      imageUrl: string;
      fallbackText: null;
    }
  | {
      handled: true;
      imageUrl: null;
      fallbackText: string;
    };

export async function resolvePastedImageUrl(
  value: string,
  resolveSharedImageUrl: (
    value: string,
  ) => Promise<string | null> = resolveSharedEmbeddableImageUrl,
): Promise<PastedImageResolution> {
  const src = value.trim();
  const directImageUrl = resolveEmbeddableImageUrl(src);
  if (directImageUrl) {
    return {
      handled: true,
      imageUrl: directImageUrl,
      fallbackText: null,
    };
  }

  if (!isSupportedSharedImageUrl(src)) {
    return {
      handled: false,
      imageUrl: null,
      fallbackText: null,
    };
  }

  try {
    const sharedImageUrl = await resolveSharedImageUrl(src);
    if (sharedImageUrl) {
      return {
        handled: true,
        imageUrl: sharedImageUrl,
        fallbackText: null,
      };
    }
  } catch {}

  return {
    handled: true,
    imageUrl: null,
    fallbackText: src,
  };
}
