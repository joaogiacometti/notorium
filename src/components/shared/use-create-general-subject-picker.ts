"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createSubject } from "@/app/actions/subjects";
import { loadSubjectOptions } from "@/components/shared/load-subject-options";
import type { SubjectOption } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface UseCreateGeneralSubjectPickerOptions {
  initialSubjects?: SubjectOption[];
  open?: boolean;
  loadSubjectsOnOpen?: boolean;
  onSubjectCreated: (subjectId: string) => void;
}

/**
 * Keeps a subject picker in sync while allowing inline general-subject creation.
 *
 * @example
 * const { subjects, handleCreateSubject } = useCreateGeneralSubjectPicker({ initialSubjects, onSubjectCreated: setSubjectId });
 */
export function useCreateGeneralSubjectPicker({
  initialSubjects,
  open = false,
  loadSubjectsOnOpen = false,
  onSubjectCreated,
}: Readonly<UseCreateGeneralSubjectPickerOptions>) {
  const queryClient = useQueryClient();
  const [subjects, setSubjects] = useState(initialSubjects ?? []);

  useEffect(() => {
    setSubjects(initialSubjects ?? []);
  }, [initialSubjects]);

  useEffect(() => {
    if (open && loadSubjectsOnOpen) {
      void loadSubjectOptions().then((loaded) => {
        if (loaded) {
          setSubjects(loaded);
        }
      });
    }
  }, [loadSubjectsOnOpen, open]);

  async function handleCreateSubject(name: string): Promise<boolean> {
    const result = await createSubject({ name, kind: "general" });
    if (!result.success) {
      toast.error(t(result.errorCode, result.errorParams));
      return false;
    }

    // The subject exists even if the list refresh fails; still select it.
    const refreshed = await loadSubjectOptions();
    if (refreshed) {
      setSubjects(refreshed);
    }
    await queryClient.invalidateQueries({
      queryKey: ["command-palette-subjects"],
    });
    onSubjectCreated(result.subjectId ?? "");
    return true;
  }

  return { subjects, handleCreateSubject };
}
