"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAccount } from "@/app/actions/account";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import { clearStoredTheme } from "@/lib/theme";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: Readonly<DeleteAccountDialogProps>) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAccount();
      if (result && !result.success) {
        toast.error(resolveActionErrorMessage(result));
        return;
      }

      clearStoredTheme();
      window.location.assign("/login");
    });
  }

  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Account"
      description="Are you sure you want to delete your account? This action cannot be undone."
      confirmLabel="Delete Account"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      isPending={isPending}
      onConfirm={handleDelete}
    />
  );
}
