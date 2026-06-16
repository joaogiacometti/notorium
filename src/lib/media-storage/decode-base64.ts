function normalizeBase64Payload(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (!trimmed.startsWith("data:")) {
    return trimmed;
  }

  const commaIndex = trimmed.indexOf(",");
  if (commaIndex < 0 || commaIndex + 1 >= trimmed.length) {
    return null;
  }

  return trimmed.slice(commaIndex + 1);
}

/**
 * Decodes a base64 payload (optionally a `data:` URL) into raw bytes, returning
 * null when the input is empty or not syntactically valid base64. Shared by the
 * attachment and library upload mutations so both reject malformed payloads
 * identically before they reach storage.
 *
 * @example
 * const bytes = decodeBase64File(dataBase64);
 * if (!bytes) return actionError("library.invalidData");
 */
export function decodeBase64File(value: string): Uint8Array | null {
  const payload = normalizeBase64Payload(value);

  if (!payload) {
    return null;
  }

  const normalized = payload.replaceAll(/\s+/g, "");

  if (normalized.length === 0 || normalized.length % 4 !== 0) {
    return null;
  }

  if (!/^[A-Za-z0-9+/]+=*$/.test(normalized)) {
    return null;
  }

  try {
    const decoded = Buffer.from(normalized, "base64");

    if (decoded.byteLength === 0) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
