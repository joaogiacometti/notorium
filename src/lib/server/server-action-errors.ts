export type ActionErrorParams = Record<string, string | number>;

export type ActionErrorResult = {
  success?: false;
  errorCode: string;
  errorParams?: ActionErrorParams;
  errorMessage?: string;
};

export function actionError(
  errorCode: string,
  options: {
    errorParams?: ActionErrorParams;
    errorMessage?: string;
  } = {},
): ActionErrorResult {
  return {
    success: false,
    errorCode,
    errorParams: options.errorParams,
    errorMessage: options.errorMessage,
  };
}

type ErrorMessageEntry = string | ((params?: ActionErrorParams) => string);

const ERROR_MESSAGES: Record<string, ErrorMessageEntry> = {
  "common.generic": "Something went wrong. Please try again.",
  "ServerErrors.common.invalidRequest": "Invalid request.",
  "auth.rateLimited": "Too many attempts. Please try again later.",
  "auth.invalidInput": "Invalid input.",
  "auth.loginFailed": "Login failed.",
  "auth.signupFailed": "Sign up failed.",
  "auth.passwordResetUnavailable":
    "Password reset is not configured for this instance.",
  "auth.passwordResetRequestFailed":
    "Could not send password reset email. Please try again later.",
  "auth.passwordResetFailed":
    "Could not reset password. The link may be invalid or expired.",
  "auth.accessPending": "Your account is pending approval.",
  "auth.accessBlocked": "Your account access is blocked.",
  "auth.forbidden": "You are not allowed to do this.",
  "auth.userNotFound": "User not found.",
  "account.invalidData": "Invalid account data.",
  "account.updateFailed": "Failed to update account.",
  "account.deleteFailed": "Failed to delete account.",
  "account.notifications.invalidData": "Invalid notification settings.",
  "account.notifications.updateFailed":
    "Failed to update notification settings.",
  "assessments.invalidData": "Invalid assessment data.",
  "assessments.notFound": "Assessment not found.",
  "attendance.invalidSettings": "Invalid attendance settings.",
  "attendance.maxMissesExceeded": "Max misses cannot exceed total classes.",
  "attendance.invalidMissData": "Invalid miss data.",
  "attendance.missAlreadyRecorded": "A miss is already recorded for this date.",
  "attendance.missNotFound": "Miss record not found.",
  "attachments.invalidData": "Invalid attachment data.",
  "attachments.notFound": "Attachment not found.",
  "attachments.uploadFailed": "Failed to upload attachment.",
  "attachments.deleteFailed": "Failed to delete attachment.",
  "attachments.readFailed": "Failed to load attachment.",
  "attachments.mimeTypeNotAllowed": "File type is not allowed.",
  "attachments.notConfigured":
    "No media storage is configured. Contact your administrator.",
  "decks.invalidData": "Invalid deck data.",
  "decks.notFound": "Deck not found.",
  "decks.duplicateName": "A deck with this name already exists.",
  "decks.cannotEditDefault": "Cannot edit this deck.",
  "decks.cannotDeleteDefault": "Cannot delete this deck.",
  "decks.cannotMoveIntoSelf": "A deck cannot be moved into itself.",
  "decks.wouldCreateCycle": "This move would create a circular deck hierarchy.",
  "decks.wrongSubject": "Deck does not belong to the selected scope.",
  "flashcards.invalidData": "Invalid flashcard data.",
  "flashcards.notFound": "Flashcard not found.",
  "flashcards.duplicateFront": "A flashcard with this front already exists.",
  "flashcards.ai.invalidData": "Invalid flashcard input for AI generation.",
  "flashcards.ai.notConfigured":
    "AI flashcard generation is not configured for this instance.",
  "flashcards.ai.unavailable":
    "AI flashcard generation is temporarily unavailable.",
  "flashcards.ai.emptyGeneration":
    "Could not extract flashcards from this text. Try adding more content.",
  "flashcards.validation.notConfigured":
    "AI validation is not configured for this instance.",
  "flashcards.validation.unavailable":
    "AI validation is temporarily unavailable. Please try again later.",
  "flashcards.validation.noCards": "No flashcards to validate.",
  "flashcards.merge.invalidData": "Invalid merge input.",
  "flashcards.merge.noCandidates": "No similar flashcards found to merge.",
  "flashcards.merge.declined":
    "No useful connection or merge found — this card is fine on its own.",
  "flashcards.review.invalidData": "Invalid review input.",
  "flashcards.review.notFound": "Flashcard not found for review.",
  "flashcards.review.notDue": "This flashcard is not due yet.",
  "flashcards.review.unavailable":
    "Review submission is temporarily unavailable. Try again in a moment.",
  "flashcards.fsrsOptimization.locked":
    "FSRS optimization is already running. Try again in a moment.",
  "flashcards.fsrsOptimization.notEnoughHistory":
    "Not enough review history to optimize FSRS yet.",
  "flashcards.fsrsOptimization.invalidResult":
    "FSRS optimization returned parameters that could not be used.",
  "flashcards.fsrsOptimization.unavailable":
    "FSRS optimization is temporarily unavailable. Try again later.",
  "flashcards.fsrsOptimization.invalidData":
    "Invalid FSRS optimization settings.",
  "flashcards.fsrsOptimization.updateFailed":
    "Failed to update FSRS optimization settings.",
  "limits.subjectLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} subjects.`,
  "limits.childSubjectLimit": (params) =>
    `System limit reached: a subject can have up to ${params?.max} subfolders.`,
  "limits.subjectNestingDepthLimit": (params) =>
    `System limit reached: subjects can only be nested up to ${params?.max} levels deep.`,
  "limits.noteLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} notes per subject.`,
  "limits.mindmapLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} mindmaps per subject.`,
  "limits.attachmentLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} attachments per item.`,
  "limits.assessmentAttachmentLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} attachments per assessment.`,
  "limits.attachmentSizeLimit": (params) =>
    `File size limit exceeded: maximum ${params?.max} bytes.`,
  "limits.bookLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} books.`,
  "limits.bookSizeLimit": (params) =>
    `File size limit exceeded: maximum ${params?.max} bytes.`,
  "limits.assessmentLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} assessments per subject.`,
  "limits.flashcardLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} flashcards per deck.`,
  "limits.deckLimit": (params) =>
    `System limit reached: you can have up to ${params?.max} decks.`,
  "limits.childDeckLimit": (params) =>
    `System limit reached: a deck can have up to ${params?.max} child decks.`,
  "limits.deckNestingDepthLimit": (params) =>
    `System limit reached: decks can only be nested up to ${params?.max} levels deep.`,
  "limits.aiBackGenerationPerDay":
    "Daily limit reached for AI back generation.",
  "limits.aiFlashcardGenerationPerDay":
    "Daily limit reached for AI flashcard generation.",
  "limits.aiValidationPerDay": "Daily limit reached for AI validation.",
  "limits.aiMergeSynthesisPerDay": "Daily limit reached for AI card merging.",
  "notes.invalidData": "Invalid note data.",
  "notes.notFound": "Note not found.",
  "mindmaps.invalidData": "Invalid mindmap data.",
  "mindmaps.notFound": "Mindmap not found.",
  "subjects.invalidData": "Invalid subject data.",
  "subjects.notFound": "Subject not found.",
  "subjects.duplicateName": "A subject with this name already exists.",
  "subjects.cannotMoveIntoSelf": "A subject cannot be moved into itself.",
  "subjects.wouldCreateCycle":
    "This move would create a circular subject hierarchy.",
  "library.invalidData": "Invalid book data.",
  "library.notFound": "Book not found.",
  "library.uploadFailed": "Failed to upload book.",
  "library.deleteFailed": "Failed to delete book.",
  "library.mimeTypeNotAllowed": "Only PDF files are supported.",
  "library.notConfigured":
    "No media storage is configured. Contact your administrator.",
};

export function t(key: string, values?: ActionErrorParams): string {
  const entry = ERROR_MESSAGES[key];
  if (typeof entry === "function") {
    return entry(values);
  }
  return entry ?? "Something went wrong. Please try again.";
}

export function resolveActionErrorMessage(error: ActionErrorResult): string {
  if (error.errorMessage) {
    return error.errorMessage;
  }
  return t(error.errorCode, error.errorParams);
}
