import type { AuthRedirectSuccessResult } from "@/lib/server/api-contracts";

export function handleAuthRedirect(result: AuthRedirectSuccessResult) {
  window.location.assign(result.data.redirectTo);
}
