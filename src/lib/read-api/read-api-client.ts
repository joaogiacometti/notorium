import { decodeReadPayload } from "@/lib/read-api/read-payload";
import {
  type ActionErrorResult,
  toActionErrorResult,
} from "@/lib/server/server-action-errors";

type ReadApiQueryValue = string | number | readonly string[] | undefined;
type ReadApiQuery = Record<string, ReadApiQueryValue>;

type ReadApiResponse =
  | { ok: true; body: unknown }
  | { ok: false; status: number; error: ActionErrorResult };

/** A read route answered a non-2xx status; `errorCode` comes from its body. */
export class ReadApiError extends Error {
  readonly status: number;
  readonly errorCode: string;

  constructor(path: string, status: number, errorCode: string) {
    super(`GET ${path} failed with status ${status} (${errorCode})`);
    this.name = "ReadApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

/**
 * GET a read route and return its typed body, throwing `ReadApiError` on any
 * non-2xx status so React Query and `try`/`catch` callers see the failure.
 *
 * @example
 * const subjects = await fetchReadApi<SubjectOption[]>("/api/subjects/options");
 */
export async function fetchReadApi<TBody>(
  path: string,
  query: ReadApiQuery = {},
): Promise<TBody> {
  const url = buildReadApiUrl(path, query);
  const response = await sendReadApiRequest(url);
  if (!response.ok) {
    throw new ReadApiError(path, response.status, response.error.errorCode);
  }

  return response.body as TBody;
}

/**
 * GET a read route that 404s for a missing record and return `null` instead
 * of throwing for that case; every other failure still throws.
 *
 * @example
 * const note = await fetchReadApiOrNull<NoteEntity>(`/api/notes/${noteId}`);
 */
export async function fetchReadApiOrNull<TBody>(
  path: string,
): Promise<TBody | null> {
  try {
    return await fetchReadApi<TBody>(path);
  } catch (error) {
    if (error instanceof ReadApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Build a same-origin read-route URL, dropping `undefined` values and
 * repeating the key for array values.
 *
 * @example
 * buildReadApiUrl("/api/search", { q: "cell" }); // "/api/search?q=cell"
 */
export function buildReadApiUrl(path: string, query: ReadApiQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    appendQueryValue(params, key, value);
  }

  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

// The body is the route's contract (see `runUserReadRoute`); callers narrow it
// with the generic they pass, the same trust a Server Action return type had.
async function sendReadApiRequest(url: string): Promise<ReadApiResponse> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (response.ok) {
    return { ok: true, body: decodeReadPayload(await response.text()) };
  }

  // Server Actions used to redirect an expired session to /login; keep that.
  if (response.status === 401 && typeof window !== "undefined") {
    window.location.assign("/login");
  }

  const error = toActionErrorResult(await readErrorBody(response));
  return { ok: false, status: response.status, error };
}

// Error bodies come from our routes, but a proxy or crash page may answer
// HTML instead; fall back to the generic error rather than throwing.
async function readErrorBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return decodeReadPayload(text);
  } catch {
    return null;
  }
}

function appendQueryValue(
  params: URLSearchParams,
  key: string,
  value: ReadApiQueryValue,
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value === "object") {
    for (const item of value) {
      params.append(key, item);
    }
    return;
  }

  params.append(key, String(value));
}
