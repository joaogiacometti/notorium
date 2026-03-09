import { revalidatePaths } from "@/lib/server/revalidation";

export function revalidateImportedDataPaths() {
  revalidatePaths(["/subjects", "/assessments", "/planning", "/flashcards"]);
}
