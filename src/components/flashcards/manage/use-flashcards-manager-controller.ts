"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useManagerPageState } from "@/components/shared/use-manager-page-state";
import type { FlashcardManageFilter } from "@/features/flashcards/validation";
import { flashcardsManageQuery } from "@/lib/client-cache/queries";
import { LIMITS } from "@/lib/config/limits";
import type { RichTextDocument } from "@/lib/editor/document";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/page-size";
import type { FlashcardManagePage } from "@/lib/server/api-contracts";

const flashcardManagerSearchDebounceMs = 200;
const emptyManageItems: FlashcardManagePage["items"] = [];

interface UseFlashcardsManagerControllerOptions {
  initialPageData: FlashcardManagePage;
  initialFolderId?: string;
  initialSearch?: string;
  initialFilter?: FlashcardManageFilter;
  initialPageSize: number;
}

export type FlashcardTarget = {
  id: string;
  front: RichTextDocument;
};

type FlashcardManagerDialog =
  | { kind: "create" | "bulk-delete" | "bulk-move" | "bulk-reset" }
  | { kind: "delete" | "move" | "reset"; target: FlashcardTarget }
  | null;

function buildManageParams({
  folderId,
  pageSize,
  search,
  filter,
}: Readonly<{
  folderId?: string;
  pageSize: number;
  search: string;
  filter?: FlashcardManageFilter;
}>) {
  const query = new URLSearchParams({ view: "manage" });

  if (folderId) query.set("folderId", folderId);
  if (search) query.set("search", search);
  if (filter) query.set("filter", filter);
  if (pageSize !== DEFAULT_PAGE_SIZE) query.set("pageSize", String(pageSize));

  return query.toString();
}

export function useFlashcardsManagerController({
  initialPageData,
  initialFolderId,
  initialSearch,
  initialFilter,
  initialPageSize,
}: Readonly<UseFlashcardsManagerControllerOptions>) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dialog, setDialog] = useState<FlashcardManagerDialog>(null);
  const [selectedFlashcardIds, setSelectedFlashcardIds] = useState<string[]>(
    [],
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(
    initialFolderId,
  );
  const [pageSizeState, setPageSizeState] = useState(initialPageSize);
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  const hasSyncedUrlRef = useRef(false);
  pathnameRef.current = pathname;
  routerRef.current = router;
  const selectedFolderIdRef = useRef(selectedFolderId);
  selectedFolderIdRef.current = selectedFolderId;
  const {
    filter,
    pageIndex,
    resolvedSearchQuery,
    searchQuery,
    setFilter,
    setPageIndex,
    setSearchQuery,
  } = useManagerPageState<FlashcardManageFilter | undefined>({
    initialFilter,
    initialSearchQuery: initialSearch ?? "",
    searchDebounceMs: flashcardManagerSearchDebounceMs,
    onSearchChange: () => {
      setSelectedFlashcardIds([]);
    },
    onFilterChange: () => {
      setSelectedFlashcardIds([]);
    },
  });

  useEffect(() => {
    if (!hasSyncedUrlRef.current) {
      hasSyncedUrlRef.current = true;
      return;
    }

    const query = buildManageParams({
      folderId: selectedFolderIdRef.current,
      pageSize: pageSizeState,
      search: resolvedSearchQuery,
      filter,
    });

    startTransition(() => {
      routerRef.current.replace(`${pathnameRef.current}?${query}`);
    });
  }, [pageSizeState, resolvedSearchQuery, filter]);

  function handleFolderChange(nextFolderId: string | undefined) {
    setSelectedFlashcardIds([]);
    setSelectedFolderId(nextFolderId);

    const query = buildManageParams({
      folderId: nextFolderId,
      pageSize: pageSizeState,
      search: resolvedSearchQuery,
      filter,
    });

    startTransition(() => {
      router.replace(`${pathname}?${query}`);
    });
  }

  function setPageSize(nextPageSize: number) {
    setSelectedFlashcardIds([]);
    setPageIndex(0);
    setPageSizeState(nextPageSize);
  }

  const managePageQuery = useQuery({
    ...flashcardsManageQuery({
      pageIndex,
      pageSize: pageSizeState,
      folderId: selectedFolderId,
      search: resolvedSearchQuery,
      filter,
    }),
    initialData:
      pageIndex === 0 &&
      (selectedFolderId ?? undefined) === (initialFolderId ?? undefined) &&
      pageSizeState === initialPageSize &&
      resolvedSearchQuery === (initialSearch ?? "") &&
      filter === initialFilter
        ? initialPageData
        : undefined,
    placeholderData: (previousData) => previousData,
  });

  const flashcards = managePageQuery.data?.items ?? emptyManageItems;
  const total = managePageQuery.data?.total ?? 0;
  const folderCardCount = managePageQuery.data?.folderCardCount ?? 0;
  const isAtFolderLimit =
    !managePageQuery.isError &&
    selectedFolderId !== undefined &&
    folderCardCount >= LIMITS.maxFlashcardsPerFolder;

  useEffect(() => {
    const pageIds = new Set(flashcards.map((flashcard) => flashcard.id));

    setSelectedFlashcardIds((current) =>
      managePageQuery.isError
        ? []
        : current.filter((flashcardId) => pageIds.has(flashcardId)),
    );
  }, [flashcards, managePageQuery.isError]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(total / pageSizeState));
    const maxIndex = pageCount - 1;

    if (pageIndex > maxIndex) {
      setPageIndex(maxIndex);
    }
  }, [pageIndex, pageSizeState, total, setPageIndex]);

  function clearSelection() {
    setSelectedFlashcardIds([]);
  }

  return {
    dialog,
    flashcards,
    isAtFolderLimit,
    folderCardCount,
    managePageQuery,
    pageIndex,
    clearSelection,
    resolvedSearchQuery,
    searchQuery,
    selectedFolderId,
    selectedFlashcardIds,
    filter,
    setFilter,
    setDialog,
    setPageIndex,
    setPageSize,
    setSearchQuery,
    setSelectedFolderId,
    setSelectedFlashcardIds,
    handleFolderChange,
    total,
    pageSize: pageSizeState,
  };
}
