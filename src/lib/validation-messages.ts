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

export function resolveValidationMessage(
  message: string | undefined,
  t: (key: string, values?: ValidationMessageValues) => string,
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
      return t(key);
    }

    const values = JSON.parse(
      decodeURIComponent(encodedValues),
    ) as ValidationMessageValues;
    return t(key, values);
  } catch {
    return message;
  }
}
