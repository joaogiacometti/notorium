import type { ActionErrorParams } from "@/lib/server/server-action-errors";

const errorMessages: Record<
  string,
  string | ((params?: ActionErrorParams) => string)
> = {
  "common.generic": "Something went wrong. Please try again.",
  "common.invalidRequest": "Invalid request.",
  "subjects.invalidData": "Invalid subject data.",
  "subjects.notFound": "Subject not found.",
  "notes.invalidData": "Invalid note data.",
  "notes.notFound": "Note not found.",
  "flashcards.invalidData": "Invalid flashcard data.",
  "flashcards.notFound": "Flashcard not found.",
  "flashcards.duplicateFront": "A flashcard with this front already exists.",
  "flashcards.ai.invalidData": "Invalid flashcard input for AI generation.",
  "flashcards.ai.notConfigured":
    "AI flashcard generation is not configured. Add your OpenRouter key and model in your account page.",
  "flashcards.ai.unavailable":
    "AI flashcard generation is temporarily unavailable.",
  "flashcards.ai.emptyGeneration":
    "Could not extract flashcards from this text. Try adding more content.",
  "flashcards.validation.notConfigured":
    "AI validation is not configured. Add your OpenRouter key and model in your account page.",
  "flashcards.validation.unavailable":
    "AI validation is temporarily unavailable. Please try again later.",
  "flashcards.validation.noCards": "No flashcards to validate.",
  "flashcards.review.invalidData": "Invalid review input.",
  "flashcards.review.notFound": "Flashcard not found for review.",
  "flashcards.review.notDue": "This flashcard is not due yet.",
  "flashcards.review.unavailable":
    "Review submission is temporarily unavailable. Try again in a moment.",
  "limits.subjectLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} subjects.`,
  "limits.subjectImportLimit": (params) =>
    `Import failed: you can only have up to ${params?.max} subjects.`,
  "limits.noteLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} notes per subject.`,
  "limits.assessmentLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} assessments per subject.`,
  "limits.flashcardLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} flashcards per subject.`,
};

export function tErrors(key: string, values?: ActionErrorParams): string {
  const entry = errorMessages[key];
  if (typeof entry === "function") {
    return entry(values);
  }
  return entry ?? "Something went wrong. Please try again.";
}
