export type ValidationMessageValues = Record<string, string | number | Date>;

const validationParamsSeparator = "::";

export function validationMessage(
  key: string,
  values?: ValidationMessageValues,
): string {
  if (!values) {
    return key;
  }

  return `${key}${validationParamsSeparator}${encodeURIComponent(JSON.stringify(values))}`;
}

const VALIDATION_MESSAGES: Record<string, string> = {
  "assessments.dueDateInvalid": "Due date must be a valid date.",
  "assessments.titleRequired": "Title is required.",
  "assessments.titleMaxLength": "Title must be at most 100 characters.",
  "assessments.descriptionMaxLength":
    "Description must be at most 1000 characters.",
  "assessments.score.notNumber": "Score must be a number.",
  "assessments.score.minValue": "Score cannot be negative.",
  "assessments.score.maxValue": "Score cannot exceed 100.",
  "assessments.weight.notNumber": "Weight must be a number.",
  "assessments.weight.minValue": "Weight cannot be negative.",
  "assessments.weight.maxValue": "Weight cannot exceed 100.",
  "attendance.totalClasses.integer": "Must be a whole number.",
  "attendance.totalClasses.min": "Must have at least 1 class.",
  "attendance.totalClasses.max": "Cannot exceed 365 classes.",
  "attendance.maxMisses.integer": "Must be a whole number.",
  "attendance.maxMisses.min": "Cannot be negative.",
  "attendance.maxMisses.max": "Cannot exceed 365 misses.",
  "attendance.dateRequired": "Date is required.",
  "account.nameMinLength": "Name must be at least 2 characters.",
  "account.nameMaxLength": "Name must be at most 100 characters.",
  "account.aiModelRequired": "Model is required.",
  "account.aiModelMaxLength": "Model must be at most 150 characters.",
  "account.aiApiKeyRequired": "API key is required.",
  "account.aiApiKeyMaxLength": "API key must be at most 500 characters.",
  "search.queryMaxLength": "Search query must be at most 200 characters.",
  "Validation.flashcards.subjectRequired": "Subject is required.",
  "Validation.flashcards.textRequired": "Text is required.",
  "Validation.flashcards.textMaxLength":
    "Text must be 10,000 characters or less.",
};

function resolveMessage(key: string, values?: ValidationMessageValues): string {
  const message = VALIDATION_MESSAGES[key] ?? key;
  if (!values) {
    return message;
  }
  return message.replace(/\{(\w+)\}/g, (_, param: string) => {
    return String(values[param] ?? `{${param}}`);
  });
}

export function resolveValidationMessages(
  message: string | undefined,
): string | undefined {
  if (!message || !message.startsWith("Validation.")) {
    return message;
  }

  const [key, encodedValues] = message.split(validationParamsSeparator);

  if (!key) {
    return message;
  }

  try {
    if (!encodedValues) {
      return resolveMessage(key);
    }

    const values = JSON.parse(
      decodeURIComponent(encodedValues),
    ) as ValidationMessageValues;
    return resolveMessage(key, values);
  } catch {
    return message;
  }
}
