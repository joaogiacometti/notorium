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
  "Validation.common.invalidRequest": "Invalid request.",
  "Validation.account.nameMaxLength": "Name must be at most 100 characters.",
  "Validation.account.nameMinLength": "Name must be at least 2 characters.",
  "Validation.assessments.descriptionMaxLength":
    "Description must be at most 1000 characters.",
  "Validation.assessments.dueDateInvalid": "Due date must be a valid date.",
  "Validation.assessments.score.maxValue": "Score cannot exceed 100.",
  "Validation.assessments.score.minValue": "Score cannot be negative.",
  "Validation.assessments.score.notNumber": "Score must be a number.",
  "Validation.assessments.titleMaxLength":
    "Title must be at most 100 characters.",
  "Validation.assessments.titleRequired": "Title is required.",
  "Validation.assessments.weight.maxValue": "Weight cannot exceed 100.",
  "Validation.assessments.weight.minValue": "Weight cannot be negative.",
  "Validation.assessments.weight.notNumber": "Weight must be a number.",
  "Validation.attendance.dateRequired": "Date is required.",
  "Validation.attendance.maxMisses.max": "Cannot exceed 365 misses.",
  "Validation.attendance.maxMisses.min": "Cannot be negative.",
  "Validation.attendance.maxMisses.integer": "Must be a whole number.",
  "Validation.attendance.maxMisses.exceedsTotal":
    "Cannot exceed total classes.",
  "Validation.attendance.totalClasses.max": "Cannot exceed 365 classes.",
  "Validation.attendance.totalClasses.min": "Must have at least 1 class.",
  "Validation.attendance.totalClasses.integer": "Must be a whole number.",
  "Validation.auth.confirmPasswordRequired": "Please confirm your password.",
  "Validation.auth.emailInvalid": "Invalid email address.",
  "Validation.auth.emailMaxLength": "Email must be at most 254 characters.",
  "Validation.auth.nameMaxLength": "Name must be at most 100 characters.",
  "Validation.auth.nameMinLength": "Name must be at least 2 characters.",
  "Validation.auth.passwordMaxLength":
    "Password must be at most 128 characters.",
  "Validation.auth.passwordMinLength":
    "Password must be at least 8 characters.",
  "Validation.auth.passwordsDoNotMatch": "Passwords do not match.",
  "Validation.flashcards.backMaxLength":
    "Back must be at most 4,000 characters.",
  "Validation.flashcards.backRequired": "Back is required.",
  "Validation.flashcards.attachmentLimit":
    "Flashcard content can include at most {max} attachments.",
  "Validation.flashcards.frontMaxLength":
    "Front must be at most 1,000 characters.",
  "Validation.flashcards.frontRequired": "Front is required.",
  "Validation.flashcards.deckRequired": "Deck is required.",
  "Validation.flashcards.subjectRequired": "Subject is required.",
  "Validation.flashcards.textMaxLength":
    "Text must be 10,000 characters or less.",
  "Validation.flashcards.textRequired": "Text is required.",
  "Validation.decks.nameRequired": "Name is required.",
  "Validation.decks.nameMaxLength": "Name must be at most 100 characters.",
  "Validation.notes.contentMaxLength":
    "Content must be at most 100,000 characters.",
  "Validation.notes.attachmentLimit":
    "Content can include at most {max} attachments.",
  "Validation.notes.titleMaxLength": "Title must be at most 200 characters.",
  "Validation.notes.titleRequired": "Title is required.",
  "Validation.search.queryMaxLength":
    "Search query must be at most 200 characters.",
  "Validation.subjects.descriptionMaxLength":
    "Description must be at most 500 characters.",
  "Validation.subjects.nameMaxLength": "Name must be at most 100 characters.",
  "Validation.subjects.nameRequired": "Name is required.",
  "Validation.theme.invalid": "Invalid theme.",
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
