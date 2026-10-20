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
  "Validation.auth.resetTokenRequired": "Reset token is required.",
  "Validation.flashcards.backMaxLength":
    "Back must be at most 4,000 characters.",
  "Validation.flashcards.backRequired": "Back is required.",
  "Validation.flashcards.attachmentLimit":
    "Flashcard content can include at most {max} attachments.",
  "Validation.flashcards.frontMaxLength":
    "Front must be at most 1,000 characters.",
  "Validation.flashcards.frontRequired": "Front is required.",
  "Validation.flashcards.subjectRequired": "Subject is required.",
  "Validation.notes.contentMaxLength":
    "Content must be at most 100,000 characters.",
  "Validation.notes.attachmentLimit":
    "Content can include at most {max} attachments.",
  "Validation.notes.titleMaxLength": "Title must be at most 200 characters.",
  "Validation.notes.titleRequired": "Title is required.",
  "Validation.mindmaps.titleRequired": "Title is required.",
  "Validation.mindmaps.titleMaxLength": "Title must be at most 200 characters.",
  "Validation.mindmaps.dataTooLarge": "This mindmap is too large to save.",
  "Validation.mindmaps.tooManyNodes": "A mindmap can have at most {max} nodes.",
  "Validation.mindmaps.attachmentLimit":
    "A mindmap can include at most {max} images.",
  "Validation.search.queryMaxLength":
    "Search query must be at most 200 characters.",
  "Validation.subjects.nameMaxLength": "Name must be at most 100 characters.",
  "Validation.subjects.nameReservedDelimiter":
    "Name cannot contain the reserved path delimiter (::).",
  "Validation.subjects.nameRequired": "Name is required.",
  "Validation.theme.invalid": "Invalid theme.",
};

function resolveMessage(key: string, values?: ValidationMessageValues): string {
  const message = VALIDATION_MESSAGES[key] ?? key;
  if (!values) {
    return message;
  }
  return message.replaceAll(/\{(\w+)\}/g, (_, param: string) => {
    return String(values[param] ?? `{${param}}`);
  });
}

export function resolveValidationMessages(
  message: string | undefined,
): string | undefined {
  if (!message?.startsWith("Validation.")) {
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
