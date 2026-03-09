import { revalidatePaths } from "@/lib/server/revalidation";

export function revalidateImportedDataPaths() {
  revalidatePaths(["/subjects", "/assessments", "/flashcards/review"]);
}
