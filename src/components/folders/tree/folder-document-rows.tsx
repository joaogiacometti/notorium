"use client";

import { useQuery } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { DocumentRows } from "@/components/folders/tree/folder-tree-document-rows";
import { folderDocumentsQuery } from "@/lib/client-cache/queries";

/** Each expanded folder observes the shared document cache, including mobile/desktop trees. */
export function FolderDocumentRows({
  folderId,
  ...props
}: Omit<ComponentProps<typeof DocumentRows>, "documents" | "onRetry"> & {
  folderId: string;
}) {
  const query = useQuery(folderDocumentsQuery(folderId));
  return (
    <DocumentRows
      {...props}
      documents={query.isError ? "error" : (query.data ?? "loading")}
      onRetry={() => void query.refetch()}
    />
  );
}
