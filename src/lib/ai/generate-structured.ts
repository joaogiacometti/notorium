import { generateObject } from "ai";
import type { z } from "zod";
import type { ResolvedUserAiSettings } from "@/features/ai/queries";
import { AiConfigurationError } from "@/lib/ai/errors";
import { getUserAiModel } from "@/lib/ai/provider";

interface GenerateStructuredOutputOptions<TSchema extends z.ZodType> {
  settings: ResolvedUserAiSettings;
  schema: TSchema;
  system: string;
  prompt: string;
  maxOutputTokens?: number;
}

export async function generateStructuredOutput<TSchema extends z.ZodType>({
  settings,
  schema,
  system,
  prompt,
  maxOutputTokens,
}: GenerateStructuredOutputOptions<TSchema>): Promise<z.infer<TSchema>> {
  const model = getUserAiModel(settings);

  if (!model) {
    throw new AiConfigurationError();
  }

  const { object } = await generateObject({
    model,
    schema,
    system,
    prompt,
    temperature: 0.3,
    maxOutputTokens,
  });

  return object as z.infer<TSchema>;
}
