export class AiConfigurationError extends Error {
  constructor() {
    super("AI provider is not configured");
    this.name = "AiConfigurationError";
  }
}
