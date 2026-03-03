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

export function resolveActionErrorMessage(
  error: ActionErrorResult,
  t: TranslateActionError,
): string {
  try {
    return t(error.errorCode, error.errorParams);
  } catch {
    if (error.errorMessage) {
      return error.errorMessage;
    }

    return t("common.generic");
  }
}
