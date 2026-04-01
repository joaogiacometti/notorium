export type ActionErrorParams = Record<string, string | number>;

export type ActionErrorResult = {
  success?: false;
  errorCode: string;
  errorParams?: ActionErrorParams;
  errorMessage?: string;
};

type TranslateActionError = (key: string, values?: ActionErrorParams) => string;

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

const HARDCODED_ERROR_MESSAGES: Record<string, string> = {
  "common.generic": "Something went wrong. Please try again.",
  "common.invalidRequest": "Invalid request.",
  "auth.rateLimited": "Too many attempts. Please try again later.",
  "auth.invalidInput": "Invalid input.",
  "auth.loginFailed": "Login failed.",
  "auth.signupFailed": "Sign up failed.",
  "auth.accessPending": "Your account is pending approval.",
  "auth.accessBlocked": "Your account access is blocked.",
  "auth.forbidden": "You are not allowed to do this.",
  "auth.userNotFound": "User not found.",
  "notes.invalidData": "Invalid note data.",
  "notes.notFound": "Note not found.",
  "assessments.invalidData": "Invalid assessment data.",
  "assessments.notFound": "Assessment not found.",
  "attendance.invalidSettings": "Invalid attendance settings.",
  "attendance.maxMissesExceeded": "Max misses cannot exceed total classes.",
  "attendance.invalidMissData": "Invalid miss data.",
  "attendance.missAlreadyRecorded": "A miss is already recorded for this date.",
  "attendance.missNotFound": "Miss record not found.",
  "dataTransfer.invalidImportFormat": "Invalid import file format.",
  "dataTransfer.noSubjectsToImport": "No subjects to import.",
  "dataTransfer.importFailed": "Failed to import data.",
  "account.invalidData": "Invalid account data.",
  "account.updateFailed": "Failed to update account.",
  "account.ai.invalidData": "Invalid AI settings.",
  "account.ai.updateFailed": "Failed to update AI settings.",
  "account.ai.clearFailed": "Failed to clear AI settings.",
};

function defaultTranslator(key: string, values?: ActionErrorParams): string {
  let message =
    HARDCODED_ERROR_MESSAGES[key] ?? "Something went wrong. Please try again.";
  if (values) {
    for (const [paramKey, paramValue] of Object.entries(values)) {
      message = message.replace(`{${paramKey}}`, String(paramValue));
    }
  }
  return message;
}

export function resolveActionErrorMessage(
  error: ActionErrorResult,
  t?: TranslateActionError,
): string {
  const translator = t ?? defaultTranslator;
  try {
    return translator(error.errorCode, error.errorParams);
  } catch {
    return translator("common.generic");
  }
}
