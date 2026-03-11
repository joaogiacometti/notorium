import { revalidatePaths } from "@/lib/server/revalidation";

export function revalidateImportedDataPaths() {
  revalidatePaths(["/subjects", "/planning", "/flashcards"]);
}
