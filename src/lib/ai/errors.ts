export class AiConfigurationError extends Error {
  constructor() {
    super("AI provider is not configured");
    this.name = "AiConfigurationError";
  }
}

export class AiStoredCredentialError extends Error {
  constructor() {
    super("Stored AI credentials are invalid");
    this.name = "AiStoredCredentialError";
  }
}
