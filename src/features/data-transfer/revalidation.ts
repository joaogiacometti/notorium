import { revalidatePaths } from "@/lib/revalidation";

export function revalidateImportedDataPaths() {
  revalidatePaths(["/subjects", "/assessments", "/flashcards/review"]);
}
