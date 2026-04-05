import { revalidatePaths } from "@/lib/server/revalidation";

export function revalidateUserThemePaths() {
  revalidatePaths(["/account"]);
}
