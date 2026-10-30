"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useManagerPageState } from "@/components/shared/use-manager-page-state";
import type { StrugglingFlashcard } from "@/features/flashcards/refine/types";
import type { FlashcardManageFilter } from "@/features/flashcards/validation";
import { LIMITS } from "@/lib/config/limits";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/page-size";
import {
  fetchFlashcardsManagePage,
  fetchStrugglingFlashcards,
} from "@/lib/read-api/flashcards";
import type { FlashcardManagePage } from "@/lib/server/api-contracts";
import {
  actionError,
  resolveActionErrorMessage,
} from "@/lib/server/server-action-errors";

const flashcardManagerSearchDebounceMs = 200;
const emptyManageItems: FlashcardManagePage["items"] = [];

interface UseFlashcardsManagerControllerOptions {
  initialPageData: FlashcardManagePage;
  initialSubjectId?: string;
  initialSearch?: string;
  initialFilter?: FlashcardManageFilter;
  initialPageSize: number;
}

export type FlashcardTarget = {
  id: string;
  front: string;
};

type FlashcardManagerDialog =
  | { kind: "create" | "bulk-delete" | "bulk-move" | "bulk-reset" }
  | { kind: "delete" | "move" | "reset"; target: FlashcardTarget }
  | null;

function buildManageParams({
  subjectId,
  pageSize,
  search,
  filter,
}: Readonly<{
  subjectId?: string;
  pageSize: number;
  search: string;
  filter?: FlashcardManageFilter;
}>) {
  const query = new URLSearchParams({ view: "manage" });

  if (subjectId) query.set("subjectId", subjectId);
  if (search) query.set("search", search);
  if (filter) query.set("filter", filter);
  if (pageSize !== DEFAULT_PAGE_SIZE) query.set("pageSize", String(pageSize));

  return query.toString();
}

export function useFlashcardsManagerController({
  initialPageData,
  initialSubjectId,
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
  const [refineMode, setRefineMode] = useState(false);
  const [strugglingCards, setStrugglingCards] = useState<StrugglingFlashcard[]>(
    [],
  );
  const [isLoadingStrugglingCards, setIsLoadingStrugglingCards] =
    useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<
    string | undefined
  >(initialSubjectId);
  const [pageSizeState, setPageSizeState] = useState(initialPageSize);
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  const hasSyncedUrlRef = useRef(false);
  pathnameRef.current = pathname;
  routerRef.current = router;
  const selectedSubjectIdRef = useRef(selectedSubjectId);
  selectedSubjectIdRef.current = selectedSubjectId;
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
      subjectId: selectedSubjectIdRef.current,
      pageSize: pageSizeState,
      search: resolvedSearchQuery,
      filter,
    });

    startTransition(() => {
      routerRef.current.replace(`${pathnameRef.current}?${query}`);
    });
  }, [pageSizeState, resolvedSearchQuery, filter]);

  function handleSubjectChange(nextSubjectId: string | undefined) {
    setSelectedFlashcardIds([]);
    setSelectedSubjectId(nextSubjectId);

    const query = buildManageParams({
      subjectId: nextSubjectId,
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
    queryKey: [
      "flashcards-manage-page",
      pageIndex,
      pageSizeState,
      selectedSubjectId ?? "all",
      resolvedSearchQuery,
      filter ?? "all",
    ],
    queryFn: () =>
      fetchFlashcardsManagePage({
        pageIndex,
        pageSize: pageSizeState,
        subjectId: selectedSubjectId,
        search: resolvedSearchQuery,
        filter,
      }),
    initialData:
      pageIndex === 0 &&
      (selectedSubjectId ?? undefined) === (initialSubjectId ?? undefined) &&
      pageSizeState === initialPageSize &&
      resolvedSearchQuery === (initialSearch ?? "") &&
      filter === initialFilter
        ? initialPageData
        : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 20,
    retry: false,
  });

  const flashcards = managePageQuery.data?.items ?? emptyManageItems;
  const total = managePageQuery.data?.total ?? 0;
  const subjectCardCount = managePageQuery.data?.subjectCardCount ?? 0;
  const isAtSubjectLimit =
    !managePageQuery.isError &&
    selectedSubjectId !== undefined &&
    subjectCardCount >= LIMITS.maxFlashcardsPerSubject;

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

  function refreshManagePage() {
    setSelectedFlashcardIds([]);
    void managePageQuery.refetch();
  }

  async function refreshStrugglingCards(): Promise<boolean> {
    setIsLoadingStrugglingCards(true);

    try {
      const result = await fetchStrugglingFlashcards();

      if (!result.success) {
        toast.error(resolveActionErrorMessage(result));
        return false;
      }

      setStrugglingCards(result.cards);
      return true;
    } catch {
      toast.error(resolveActionErrorMessage(actionError("common.generic")));
      return false;
    } finally {
      setIsLoadingStrugglingCards(false);
    }
  }

  async function startRefineMode() {
    const loaded = await refreshStrugglingCards();

    if (loaded) {
      setRefineMode(true);
    }
  }

  function exitRefine() {
    setRefineMode(false);
    setStrugglingCards([]);
  }

  return {
    dialog,
    flashcards,
    isAtSubjectLimit,
    subjectCardCount,
    managePageQuery,
    pageIndex,
    refreshManagePage,
    resolvedSearchQuery,
    searchQuery,
    selectedSubjectId,
    selectedFlashcardIds,
    filter,
    setFilter,
    setDialog,
    setPageIndex,
    setPageSize,
    setSearchQuery,
    setSelectedSubjectId,
    setSelectedFlashcardIds,
    handleSubjectChange,
    total,
    pageSize: pageSizeState,
    refineMode,
    strugglingCards,
    isLoadingStrugglingCards,
    startRefineMode,
    refreshStrugglingCards,
    exitRefine,
  };
}
