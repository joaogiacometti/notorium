"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { createSubject } from "@/app/actions/subjects";
import { invalidateSubjectViews } from "@/lib/client-cache/invalidation";
import { subjectOptionsQuery } from "@/lib/client-cache/queries";
import type { SubjectOption } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface UseCreateInlineSubjectPickerOptions {
  initialSubjects?: SubjectOption[];
  open?: boolean;
  loadSubjectsOnOpen?: boolean;
  onSubjectCreated: (subjectId: string) => void;
}

/**
 * Keeps a subject picker in sync while allowing inline subject creation.
 *
 * @example
 * const { subjects, handleCreateSubject } = useCreateInlineSubjectPicker({ initialSubjects, onSubjectCreated: setSubjectId });
 */
export function useCreateInlineSubjectPicker({
  initialSubjects,
  open = false,
  loadSubjectsOnOpen = false,
  onSubjectCreated,
}: Readonly<UseCreateInlineSubjectPickerOptions>) {
  const queryClient = useQueryClient();
  const query = useQuery({
    ...subjectOptionsQuery(),
    initialData: initialSubjects,
    initialDataUpdatedAt: 0,
    enabled: open && (loadSubjectsOnOpen || initialSubjects !== undefined),
  });
  useEffect(() => {
    if (query.isError) toast.error("Could not load subjects.");
  }, [query.isError]);

  async function handleCreateSubject(name: string): Promise<boolean> {
    const result = await createSubject({ name });
    if (!result.success) {
      toast.error(t(result.errorCode, result.errorParams));
      return false;
    }

    await invalidateSubjectViews(queryClient);
    // A picker without an active query still needs the newly created option.
    // Creation remains successful even when refreshing the list fails.
    await queryClient.fetchQuery(subjectOptionsQuery()).catch(() => null);
    onSubjectCreated(result.subjectId ?? "");
    return true;
  }

  return { subjects: query.data ?? [], handleCreateSubject };
}
