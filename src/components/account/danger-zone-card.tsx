"use client";

import { useState } from "react";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/account/settings-section";
import { Button } from "@/components/ui/button";

/**
 * Account deletion entry point as a flat settings row. Opens the confirmation
 * dialog before the destructive action runs.
 *
 * @example
 * <DangerZoneCard />
 */
export function DangerZoneCard() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <SettingsSection title="Danger Zone">
        <SettingsRow
          label="Delete account"
          description="Permanently removes your subjects, notes, assessments, and attendance records. This cannot be undone."
          keywords="remove danger erase"
          action={
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="w-full sm:w-fit"
            >
              Delete Account
            </Button>
          }
        />
      </SettingsSection>
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
