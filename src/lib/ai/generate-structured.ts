import { generateObject } from "ai";
import type { z } from "zod";
import type { ResolvedAiSettings } from "@/lib/ai/config";
import { getAiModelOrThrow } from "@/lib/ai/provider";

interface GenerateStructuredOutputOptions<TSchema extends z.ZodType> {
  settings: ResolvedAiSettings;
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
  const model = getAiModelOrThrow(settings);

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
