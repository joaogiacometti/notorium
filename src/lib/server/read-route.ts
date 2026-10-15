import { z } from "zod";
import { getOptionalSession } from "@/lib/auth/auth";
import { encodeReadPayload } from "@/lib/read-api/read-payload";
import { logServerFailure } from "@/lib/server/action-failure";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

interface ReadRouteUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

/** Input schema for read routes that take no parameters. */
export const emptyReadInputSchema = z.object({});

interface UserReadRouteOptions<TSchema extends z.ZodType, TResult> {
  /** `<area>.<read>` scope written to `read_route_failed` logs. */
  logScope: string;
  schema: TSchema;
  input: unknown;
  read: (user: ReadRouteUser, data: z.infer<TSchema>) => Promise<TResult>;
  /** When set, a `null` read result becomes a 404 with this error code. */
  notFoundErrorCode?: string;
}

interface SearchParamShape {
  numberKeys?: readonly string[];
  arrayKeys?: readonly string[];
}

/**
 * Run a client-callable GET read: require an approved session, Zod-validate
 * the input, delegate to a `userId`-scoped feature query, and answer JSON.
 * Failures answer an `ActionErrorResult` body with a matching status
 * (401/400/404/500); unexpected throws are logged without their message.
 *
 * @example
 * return runUserReadRoute({
 *   logScope: "notes.byId",
 *   schema: idSchema,
 *   input: noteId,
 *   read: (user, id) => getNoteByIdForUser(user.id, id),
 *   notFoundErrorCode: "notes.notFound",
 * });
 */
export async function runUserReadRoute<TSchema extends z.ZodType, TResult>(
  options: UserReadRouteOptions<TSchema, TResult>,
): Promise<Response> {
  const session = await getOptionalSession();
  if (!session) {
    return readRouteResponse(actionError("auth.forbidden"), 401);
  }

  const parsed = options.schema.safeParse(options.input);
  if (!parsed.success) {
    return readRouteResponse(
      actionError("ServerErrors.common.invalidRequest"),
      400,
    );
  }

  return readWithFailureHandling(options, session.user, parsed.data);
}

/**
 * Turn a request's query string into a plain object for Zod: repeated
 * `arrayKeys` become string arrays and `numberKeys` become numbers (`NaN` for
 * junk, which numeric schemas reject). Absent keys stay `undefined`.
 *
 * @example
 * readSearchParams("https://x/api?pageIndex=2&subjectIds=a&subjectIds=b", {
 *   numberKeys: ["pageIndex"],
 *   arrayKeys: ["subjectIds"],
 * }); // { pageIndex: 2, subjectIds: ["a", "b"] }
 */
export function readSearchParams(
  requestUrl: string,
  shape: SearchParamShape = {},
): Record<string, unknown> {
  const params = new URL(requestUrl).searchParams;
  const input: Record<string, unknown> = {};

  for (const key of new Set(params.keys())) {
    input[key] = readSearchParam(params, key, shape);
  }

  return input;
}

async function readWithFailureHandling<TSchema extends z.ZodType, TResult>(
  options: UserReadRouteOptions<TSchema, TResult>,
  user: ReadRouteUser,
  data: z.infer<TSchema>,
): Promise<Response> {
  try {
    const result = await options.read(user, data);
    if (result === null && options.notFoundErrorCode) {
      return readRouteResponse(actionError(options.notFoundErrorCode), 404);
    }

    return readRouteResponse(result, 200);
  } catch (error) {
    logServerFailure("read_route_failed", options.logScope, error);
    return readRouteResponse(actionError("common.generic"), 500);
  }
}

function readSearchParam(
  params: URLSearchParams,
  key: string,
  shape: SearchParamShape,
): unknown {
  if (shape.arrayKeys?.includes(key)) {
    return params.getAll(key);
  }

  const value = params.get(key);
  return shape.numberKeys?.includes(key) ? Number(value) : value;
}

// Per-user data: never let a shared cache or the browser HTTP cache keep it;
// React Query owns client-side caching.
function readRouteResponse(
  body: unknown | ActionErrorResult,
  status: number,
): Response {
  return new Response(encodeReadPayload(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}
