"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useTransition } from "react";
import {
  getFlashcardForManage,
  getFlashcardsManagePage,
} from "@/app/actions/flashcards";
import { useManagerPageState } from "@/components/shared/use-manager-page-state";
import { usePathname, useRouter } from "@/i18n/routing";
import { LIMITS } from "@/lib/config/limits";
import type {
  FlashcardManagePage,
  SubjectEntity,
} from "@/lib/server/api-contracts";

const managePageSize = 25;
const flashcardManagerSearchDebounceMs = 200;

interface UseFlashcardsManagerControllerOptions {
  initialPageData: FlashcardManagePage;
  initialSubjectId?: string;
  subjects: SubjectEntity[];
}

export type FlashcardTarget = {
  id: string;
  front: string;
};

export function useFlashcardsManagerController({
  initialPageData,
  initialSubjectId,
}: Readonly<UseFlashcardsManagerControllerOptions>) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [editingFlashcardId, setEditingFlashcardId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<FlashcardTarget | null>(
    null,
  );
  const [resetTarget, setResetTarget] = useState<FlashcardTarget | null>(null);
  const [selectedFlashcardIds, setSelectedFlashcardIds] = useState<string[]>(
    [],
  );
  const {
    filter: selectedSubjectId,
    pageIndex,
    resolvedSearchQuery,
    searchQuery,
    setFilter: setSelectedSubjectId,
    setPageIndex,
    setSearchQuery,
  } = useManagerPageState({
    initialFilter: initialSubjectId,
    searchDebounceMs: flashcardManagerSearchDebounceMs,
    onSearchChange: () => {
      setSelectedFlashcardIds([]);
    },
    onFilterChange: (nextSubjectId) => {
      setSelectedFlashcardIds([]);

      const query = new URLSearchParams();
      query.set("view", "manage");

      if (nextSubjectId) {
        query.set("subjectId", nextSubjectId);
      }

      startTransition(() => {
        router.replace(`${pathname}?${query.toString()}`);
      });
    },
    onInitialFilterChange: () => {
      setSelectedFlashcardIds([]);
    },
  });

  const managePageQuery = useQuery({
    queryKey: [
      "flashcards-manage-page",
      pageIndex,
      managePageSize,
      selectedSubjectId ?? "all",
      resolvedSearchQuery,
    ],
    queryFn: async () => {
      const result = await getFlashcardsManagePage({
        pageIndex,
        pageSize: managePageSize,
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
      resolvedSearchQuery.trim().length === 0
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

      const result = await getFlashcardForManage({ id: editingFlashcardId });
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
  const selectedSubjectCardCount = pageData.subjectCardCount ?? 0;
  const isAtSubjectLimit =
    selectedSubjectId !== undefined &&
    selectedSubjectCardCount >= LIMITS.maxFlashcardsPerSubject;

  useEffect(() => {
    const pageIds = new Set(flashcards.map((flashcard) => flashcard.id));

    setSelectedFlashcardIds((current) =>
      current.filter((flashcardId) => pageIds.has(flashcardId)),
    );
  }, [flashcards]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(total / managePageSize));
    const maxIndex = pageCount - 1;

    if (pageIndex > maxIndex) {
      setPageIndex(maxIndex);
    }
  }, [pageIndex, total, setPageIndex]);

  function refreshManagePage() {
    setSelectedFlashcardIds([]);
    void managePageQuery.refetch();
  }

  return {
    bulkDeleteOpen,
    bulkMoveOpen,
    createOpen,
    deleteTarget,
    editFlashcardQuery,
    editingFlashcardId,
    flashcards,
    isAtSubjectLimit,
    managePageQuery,
    pageIndex,
    refreshManagePage,
    resetTarget,
    resolvedSearchQuery,
    searchQuery,
    selectedFlashcardIds,
    selectedSubjectCardCount,
    selectedSubjectId,
    setBulkDeleteOpen,
    setBulkMoveOpen,
    setCreateOpen,
    setDeleteTarget,
    setEditingFlashcardId,
    setPageIndex,
    setResetTarget,
    setSearchQuery,
    setSelectedFlashcardIds,
    setSelectedSubjectId,
    total,
    pageSize: managePageSize,
    editingFlashcard: editFlashcardQuery.data,
  };
}
