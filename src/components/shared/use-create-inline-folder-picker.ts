"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { createFolder } from "@/app/actions/folders";
import { invalidateFolderViews } from "@/lib/client-cache/invalidation";
import { folderOptionsQuery } from "@/lib/client-cache/queries";
import type { FolderOption } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface UseCreateInlineFolderPickerOptions {
  initialFolders?: FolderOption[];
  open?: boolean;
  loadFoldersOnOpen?: boolean;
  onFolderCreated: (folderId: string) => void;
}

/**
 * Keeps a folder picker in sync while allowing inline folder creation.
 *
 * @example
 * const { folders, handleCreateFolder } = useCreateInlineFolderPicker({ initialFolders, onFolderCreated: setFolderId });
 */
export function useCreateInlineFolderPicker({
  initialFolders,
  open = false,
  loadFoldersOnOpen = false,
  onFolderCreated,
}: Readonly<UseCreateInlineFolderPickerOptions>) {
  const queryClient = useQueryClient();
  const query = useQuery({
    ...folderOptionsQuery(),
    initialData: initialFolders,
    initialDataUpdatedAt: 0,
    enabled: open && (loadFoldersOnOpen || initialFolders !== undefined),
  });
  useEffect(() => {
    if (query.isError) toast.error("Could not load folders.");
  }, [query.isError]);

  async function handleCreateFolder(name: string): Promise<boolean> {
    const result = await createFolder({ name });
    if (!result.success) {
      toast.error(t(result.errorCode, result.errorParams));
      return false;
    }

    await invalidateFolderViews(queryClient);
    // A picker without an active query still needs the newly created option.
    // Creation remains successful even when refreshing the list fails.
    await queryClient.fetchQuery(folderOptionsQuery()).catch(() => null);
    onFolderCreated(result.folderId ?? "");
    return true;
  }

  return { folders: query.data ?? [], handleCreateFolder };
}
