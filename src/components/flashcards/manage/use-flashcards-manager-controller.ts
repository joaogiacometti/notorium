"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useManagerPageState } from "@/components/shared/use-manager-page-state";
import type { StrugglingFlashcard } from "@/features/flashcards/refine/types";
import { LIMITS } from "@/lib/config/limits";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/page-size";
import {
  fetchFlashcardForManage,
  fetchFlashcardsManagePage,
  fetchStrugglingFlashcards,
} from "@/lib/read-api/flashcards";
import type {
  FlashcardEntity,
  FlashcardManagePage,
} from "@/lib/server/api-contracts";
import {
  actionError,
  resolveActionErrorMessage,
} from "@/lib/server/server-action-errors";

const flashcardManagerSearchDebounceMs = 200;

interface UseFlashcardsManagerControllerOptions {
  initialPageData: FlashcardManagePage;
  initialSubjectId?: string;
  initialSearch?: string;
  initialPageSize: number;
}

export type FlashcardTarget = {
  id: string;
  front: string;
};

function buildManageParams({
  subjectId,
  pageSize,
  search,
}: Readonly<{
  subjectId?: string;
  pageSize: number;
  search: string;
}>) {
  const query = new URLSearchParams({ view: "manage" });

  if (subjectId) query.set("subjectId", subjectId);
  if (search) query.set("search", search);
  if (pageSize !== DEFAULT_PAGE_SIZE) query.set("pageSize", String(pageSize));

  return query.toString();
}

export function useFlashcardsManagerController({
  initialPageData,
  initialSubjectId,
  initialSearch,
  initialPageSize,
}: Readonly<UseFlashcardsManagerControllerOptions>) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkResetOpen, setBulkResetOpen] = useState(false);
  const [editingFlashcardId, setEditingFlashcardId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<FlashcardTarget | null>(
    null,
  );
  const [moveTarget, setMoveTarget] = useState<FlashcardTarget | null>(null);
  const [resetTarget, setResetTarget] = useState<FlashcardTarget | null>(null);
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
    pageIndex,
    resolvedSearchQuery,
    searchQuery,
    setPageIndex,
    setSearchQuery,
  } = useManagerPageState({
    initialFilter: undefined,
    initialSearchQuery: initialSearch ?? "",
    searchDebounceMs: flashcardManagerSearchDebounceMs,
    onSearchChange: () => {
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
    });

    startTransition(() => {
      routerRef.current.replace(`${pathnameRef.current}?${query}`);
    });
  }, [pageSizeState, resolvedSearchQuery]);

  function handleSubjectChange(nextSubjectId: string | undefined) {
    setSelectedFlashcardIds([]);
    setSelectedSubjectId(nextSubjectId);

    const query = buildManageParams({
      subjectId: nextSubjectId,
      pageSize: pageSizeState,
      search: resolvedSearchQuery,
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
    ],
    queryFn: async () => {
      const result = await fetchFlashcardsManagePage({
        pageIndex,
        pageSize: pageSizeState,
        subjectId: selectedSubjectId,
        search: resolvedSearchQuery,
      });

      if ("errorCode" in result) {
        return { items: [], total: 0, subjectCardCount: null };
      }

      return result;
    },
    initialData:
      pageIndex === 0 &&
      (selectedSubjectId ?? undefined) === (initialSubjectId ?? undefined) &&
      pageSizeState === initialPageSize &&
      resolvedSearchQuery === (initialSearch ?? "")
        ? initialPageData
        : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 20,
  });

  const editFlashcardQuery = useQuery({
    queryKey: ["flashcard-manage-edit", editingFlashcardId],
    queryFn: async () => {
      if (!editingFlashcardId) {
        return null;
      }

      const result = await fetchFlashcardForManage(editingFlashcardId);
      if ("errorCode" in result) {
        return null;
      }

      return result.flashcard;
    },
    enabled: editingFlashcardId !== null,
  });

  const pageData = managePageQuery.data ?? initialPageData;
  const flashcards = pageData.items;
  const total = pageData.total;
  const subjectCardCount = pageData.subjectCardCount ?? 0;
  const isAtSubjectLimit =
    selectedSubjectId !== undefined &&
    subjectCardCount >= LIMITS.maxFlashcardsPerSubject;

  useEffect(() => {
    const pageIds = new Set(flashcards.map((flashcard) => flashcard.id));

    setSelectedFlashcardIds((current) =>
      current.filter((flashcardId) => pageIds.has(flashcardId)),
    );
  }, [flashcards]);

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

  function cacheUpdatedFlashcard(updatedFlashcard: FlashcardEntity) {
    queryClient.setQueryData(
      ["flashcard-manage-edit", updatedFlashcard.id],
      updatedFlashcard,
    );
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
    bulkDeleteOpen,
    bulkMoveOpen,
    bulkResetOpen,
    createOpen,
    deleteTarget,
    moveTarget,
    editFlashcardQuery,
    editingFlashcardId,
    flashcards,
    isAtSubjectLimit,
    subjectCardCount,
    managePageQuery,
    pageIndex,
    refreshManagePage,
    cacheUpdatedFlashcard,
    resetTarget,
    resolvedSearchQuery,
    searchQuery,
    selectedSubjectId,
    selectedFlashcardIds,
    setBulkDeleteOpen,
    setBulkMoveOpen,
    setBulkResetOpen,
    setCreateOpen,
    setDeleteTarget,
    setMoveTarget,
    setEditingFlashcardId,
    setPageIndex,
    setPageSize,
    setResetTarget,
    setSearchQuery,
    setSelectedSubjectId,
    setSelectedFlashcardIds,
    handleSubjectChange,
    total,
    pageSize: pageSizeState,
    editingFlashcard: editFlashcardQuery.data,
    refineMode,
    strugglingCards,
    isLoadingStrugglingCards,
    startRefineMode,
    refreshStrugglingCards,
    exitRefine,
  };
}
