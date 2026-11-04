"use client";

import { useQuery } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { DocumentRows } from "@/components/subjects/tree/subject-tree-document-rows";
import { subjectDocumentsQuery } from "@/lib/client-cache/queries";

/** Each expanded folder observes the shared document cache, including mobile/desktop trees. */
export function SubjectDocumentRows({
  subjectId,
  ...props
}: Omit<ComponentProps<typeof DocumentRows>, "documents" | "onRetry"> & {
  subjectId: string;
}) {
  const query = useQuery(subjectDocumentsQuery(subjectId));
  return (
    <DocumentRows
      {...props}
      documents={query.isError ? "error" : (query.data ?? "loading")}
      onRetry={() => void query.refetch()}
    />
  );
}
