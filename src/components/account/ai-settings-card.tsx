"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
} from "@/features/account/validation";
import type { UserAiSettingsSummary } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface AiSettingsCardProps {
  initialAiSettings: UserAiSettingsSummary | null;
}

export function AiSettingsCard({
  initialAiSettings,
}: Readonly<AiSettingsCardProps>) {
  const t = useTranslations("AccountForm");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ServerActions");
  const [aiSettings, setAiSettings] = useState(initialAiSettings);
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
        toast.error(resolveActionErrorMessage(result, tErrors));
        return;
      }

      startTransition(() => {
        setAiSettings(result.settings ?? null);
      });
      form.reset({
        model: result.settings?.model ?? data.model,
        apiKey: "",
      });
      toast.success(t("ai_saved"));
    });
  });

  const handleAiClear = () => {
    startClearingAi(async () => {
      const result = await clearUserAiSettings();

      if (!result.success) {
        toast.error(resolveActionErrorMessage(result, tErrors));
        return;
      }

      startTransition(() => {
        setAiSettings(null);
      });
      form.reset({
        model: "",
        apiKey: "",
      });
      toast.success(t("ai_cleared"));
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div className="space-y-2">
            <CardTitle>{t("ai_title")}</CardTitle>
            <CardDescription>{t("ai_description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form id="form-account-ai" onSubmit={handleAiSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="account-ai-provider">
                {t("ai_provider")}
              </FieldLabel>
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
                  <FieldLabel htmlFor="account-ai-model">
                    {t("ai_model")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="account-ai-model"
                    type="text"
                    placeholder={t("ai_model_placeholder")}
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <FieldDescription>{t("ai_model_hint")}</FieldDescription>
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
                    {t("ai_api_key")}
                  </FieldLabel>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      id="account-ai-api-key"
                      type="password"
                      placeholder={t("ai_api_key_placeholder")}
                      aria-invalid={fieldState.invalid}
                      autoComplete="new-password"
                      className="pl-9"
                    />
                  </div>
                  <FieldDescription>
                    {aiSettings?.hasApiKey && aiSettings.apiKeyLastFour
                      ? t("ai_saved_key", {
                          suffix: aiSettings.apiKeyLastFour,
                        })
                      : t("ai_no_key")}
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
                    aiSettings?.hasApiKey ? t("ai_update") : t("ai_save")
                  }
                  pendingLabel={tCommon("saving")}
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
                  idleLabel={t("ai_clear")}
                  pendingLabel={tCommon("clearing")}
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
