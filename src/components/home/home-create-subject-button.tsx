"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog";
import { Button } from "@/components/ui/button";

/**
 * Home dashboard "New subject" action. Wraps the controlled
 * {@link CreateSubjectDialog} and refreshes the server-rendered dashboard so the
 * new subject appears without a manual reload.
 */
export function HomeCreateSubjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <CreateSubjectDialog
      open={open}
      onOpenChange={setOpen}
      onCreated={() => router.refresh()}
      trigger={
        <Button variant="outline" size="sm">
          <Plus className="size-4" />
          New subject
        </Button>
      }
    />
  );
}
