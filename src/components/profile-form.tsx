"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateProfile } from "@/app/actions/profile";
import { DataTransferActions } from "@/components/data-transfer-actions";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { Badge } from "@/components/ui/badge";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { UserPlan } from "@/lib/plan-limits";
import {
  type UpdateProfileForm,
  updateProfileSchema,
} from "@/lib/validations/profile";

interface ProfileFormProps {
  name: string;
  email: string;
  plan: UserPlan;
  createdAt: string;
  updatedAt: string;
}

export function ProfileForm({
  name,
  email,
  plan,
  createdAt,
  updatedAt,
}: Readonly<ProfileFormProps>) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name,
    },
  });

  const createdAtLabel = new Date(createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const updatedAtLabel = new Date(updatedAt).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function onSubmit(data: UpdateProfileForm) {
    const result = await updateProfile(data);
    if (result.success) {
      form.reset({ name: data.name });
      toast.success("Profile updated.");
      router.refresh();
      return;
    }
    toast.error(result.error);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Inspect and update your account details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="form-profile" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-profile-name">
                      Full Name
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-profile-name"
                      type="text"
                      placeholder="John Doe"
                      aria-invalid={fieldState.invalid}
                      autoComplete="name"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Field>
                <FieldLabel htmlFor="form-profile-email">Email</FieldLabel>
                <Input
                  id="form-profile-email"
                  value={email}
                  type="email"
                  disabled
                  readOnly
                />
              </Field>

              <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Plan:</span>
                  <Badge variant={plan === "free" ? "secondary" : "default"}>
                    {{ free: "Free", pro: "Pro", unlimited: "Unlimited" }[plan]}
                  </Badge>
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Joined:</span>{" "}
                  {createdAtLabel}
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Last updated:</span>{" "}
                  {updatedAtLabel}
                </p>
              </div>

              <Button
                type="submit"
                form="form-profile"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-fit"
              >
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Transfer</CardTitle>
          <CardDescription>
            Export all your subjects, notes, attendance records, and assessments
            as a JSON file, or import data from a previous export.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTransferActions />
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Once you delete your account, all of your subjects, notes,
            assessments, and attendance records will be permanently removed.
            This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
