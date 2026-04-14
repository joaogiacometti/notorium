"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  clearUserAiSettings,
  updateUserAiSettings,
} from "@/app/actions/account";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  createUserAiSettingsSchema,
  type UpdateUserAiSettingsForm,
  type UpdateUserAiSettingsFormInput,
  updateUserAiSettingsSchema,
} from "@/features/ai/validation";
import type { UserAiSettingsSummary } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface AiSettingsCardProps {
  initialAiSettings: UserAiSettingsSummary | null;
}

export function AiSettingsCard({
  initialAiSettings,
}: Readonly<AiSettingsCardProps>) {
  const [aiSettings, setAiSettings] = useState(initialAiSettings);
  const router = useRouter();
  const [isSavingAi, startSavingAi] = useTransition();
  const [isClearingAi, startClearingAi] = useTransition();
  const form = useForm<
    UpdateUserAiSettingsFormInput,
    undefined,
    UpdateUserAiSettingsForm
  >({
    resolver: zodResolver(updateUserAiSettingsSchema),
    defaultValues: {
      model: initialAiSettings?.model ?? "",
      apiKey: "",
    },
  });

  const handleAiSubmit = form.handleSubmit((data) => {
    if (!aiSettings?.hasApiKey) {
      const parsed = createUserAiSettingsSchema.safeParse(data);

      if (!parsed.success) {
        const issue = parsed.error.issues[0];

        if (issue?.path[0] === "apiKey") {
          form.setError("apiKey", {
            message: issue.message,
          });
        }

        return;
      }
    }

    startSavingAi(async () => {
      const result = await updateUserAiSettings(data);

      if (!result.success) {
        toast.error(resolveActionErrorMessage(result));
        return;
      }

      startTransition(() => {
        setAiSettings(result.settings ?? null);
      });
      form.reset({
        model: result.settings?.model ?? data.model,
        apiKey: "",
      });
      router.refresh();
      toast.success("AI settings updated.");
    });
  });

  const handleAiClear = () => {
    startClearingAi(async () => {
      const result = await clearUserAiSettings();

      if (!result.success) {
        toast.error(resolveActionErrorMessage(result));
        return;
      }

      startTransition(() => {
        setAiSettings(null);
      });
      form.reset({
        model: "",
        apiKey: "",
      });
      router.refresh();
      toast.success("AI settings cleared.");
    });
  };

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="pb-0">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div className="space-y-1">
            <CardTitle>AI Settings</CardTitle>
            <CardDescription>
              Configure your OpenRouter model and key for flashcard generation.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <form id="form-account-ai" onSubmit={handleAiSubmit}>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="account-ai-provider">Provider</FieldLabel>
              <div
                id="account-ai-provider"
                className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm"
              >
                OpenRouter
              </div>
            </Field>
            <Controller
              name="model"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="account-ai-model">Model</FieldLabel>
                  <Input
                    {...field}
                    id="account-ai-model"
                    type="text"
                    placeholder="openai/gpt-4.1-mini"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <FieldDescription>
                    Enter any OpenRouter model ID.
                  </FieldDescription>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Controller
              name="apiKey"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="account-ai-api-key">
                    OpenRouter API Key
                  </FieldLabel>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      id="account-ai-api-key"
                      type="password"
                      placeholder="sk-or-v1-..."
                      aria-invalid={fieldState.invalid}
                      autoComplete="new-password"
                      className="pl-9"
                    />
                  </div>
                  <FieldDescription>
                    {aiSettings?.hasApiKey && aiSettings.apiKeyLastFour
                      ? `Saved key ending in ${aiSettings.apiKeyLastFour}. Leave the field blank to keep it unchanged.`
                      : "No API key saved yet. AI generation will stay unavailable until you add one."}
                  </FieldDescription>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                form="form-account-ai"
                disabled={isSavingAi || isClearingAi}
                className="w-full sm:w-fit"
              >
                <AsyncButtonContent
                  pending={isSavingAi}
                  idleLabel={
                    aiSettings?.hasApiKey
                      ? "Update AI Settings"
                      : "Save AI Settings"
                  }
                  pendingLabel="Saving..."
                />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleAiClear}
                disabled={!aiSettings?.hasApiKey || isSavingAi || isClearingAi}
                className="w-full sm:w-fit"
              >
                <AsyncButtonContent
                  pending={isClearingAi}
                  idleLabel="Clear Saved Key"
                  pendingLabel="Clearing..."
                  idleIcon={<Trash2 className="size-4" />}
                />
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
