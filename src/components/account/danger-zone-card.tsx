"use client";

import { useState } from "react";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import { SettingsCard } from "@/components/account/settings-section";
import { Button } from "@/components/ui/button";

/**
 * Account deletion entry point as a danger-toned settings card. Opens the confirmation
 * dialog before the destructive action runs.
 *
 * @example
 * <DangerZoneCard />
 */
export function DangerZoneCard() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <SettingsCard
        title="Delete account"
        description="Permanently removes your folders, notes, flashcards, and review history. This cannot be undone."
        keywords="remove danger erase"
        tone="danger"
        control={
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete account
          </Button>
        }
      />
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
