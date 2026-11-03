import type { BetterAuthPlugin } from "better-auth";

/** Auth mutations belong to Server Actions; only emailed callbacks need HTTP. */
export function authHttpPolicy() {
  return {
    id: "auth-http-policy",
    onRequest: async (request, context) => {
      const basePath = new URL(context.baseURL).pathname.replace(/\/$/, "");
      const pathname = new URL(request.url).pathname;
      const callbackPrefix = `${basePath}/reset-password/`;
      const token = pathname.startsWith(callbackPrefix)
        ? pathname.slice(callbackPrefix.length)
        : "";

      if (request.method === "GET" && /^[A-Za-z0-9_-]+$/.test(token)) {
        return;
      }

      // This request-only hook leaves auth.api calls available on the server.
      // Default-deny also covers endpoints introduced by future plugins/upgrades.
      return { response: new Response(null, { status: 404 }) };
    },
  } satisfies BetterAuthPlugin;
}
