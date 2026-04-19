"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  getFlashcardForManage,
  getFlashcardsManagePage,
  validateFlashcards,
} from "@/app/actions/flashcards";
import { useManagerPageState } from "@/components/shared/use-manager-page-state";
import { LIMITS } from "@/lib/config/limits";
import type {
  FlashcardManagePage,
  FlashcardValidationIssue,
  FlashcardValidationItem,
} from "@/lib/server/api-contracts";

const managePageSize = 25;
const flashcardManagerSearchDebounceMs = 200;

interface UseFlashcardsManagerControllerOptions {
  initialPageData: FlashcardManagePage;
  initialDeckId?: string;
  initialSearch?: string;
}

export type FlashcardTarget = {
  id: string;
  front: string;
};

export function useFlashcardsManagerController({
  initialPageData,
  initialDeckId,
  initialSearch,
}: Readonly<UseFlashcardsManagerControllerOptions>) {
  const pathname = usePathname();
  const router = useRouter();
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
  const [resetTarget, setResetTarget] = useState<FlashcardTarget | null>(null);
  const [selectedFlashcardIds, setSelectedFlashcardIds] = useState<string[]>(
    [],
  );
  const [validationMode, setValidationMode] = useState(false);
  const [validationIssues, setValidationIssues] = useState<
    FlashcardValidationIssue[]
  >([]);
  const [validationFlashcards, setValidationFlashcards] = useState<
    FlashcardValidationItem[]
  >([]);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [validateAgainDialogOpen, setValidateAgainDialogOpen] = useState(false);
  const [isValidatingAgain, setIsValidatingAgain] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>(
    initialDeckId,
  );
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  pathnameRef.current = pathname;
  routerRef.current = router;
  const selectedDeckIdRef = useRef(selectedDeckId);
  selectedDeckIdRef.current = selectedDeckId;
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
    const query = new URLSearchParams();
    query.set("view", "manage");

    const currentDeckId = selectedDeckIdRef.current;
    if (currentDeckId) {
      query.set("deckId", currentDeckId);
    }
    if (resolvedSearchQuery) {
      query.set("search", resolvedSearchQuery);
    }

    startTransition(() => {
      routerRef.current.replace(`${pathnameRef.current}?${query.toString()}`);
    });
  }, [resolvedSearchQuery]);

  function handleDeckChange(nextDeckId: string | undefined) {
    setSelectedFlashcardIds([]);
    setSelectedDeckId(nextDeckId);

    const query = new URLSearchParams();
    query.set("view", "manage");

    if (nextDeckId) {
      query.set("deckId", nextDeckId);
    }
    if (resolvedSearchQuery) {
      query.set("search", resolvedSearchQuery);
    }

    startTransition(() => {
      router.replace(`${pathname}?${query.toString()}`);
    });
  }

  const managePageQuery = useQuery({
    queryKey: [
      "flashcards-manage-page",
      pageIndex,
      managePageSize,
      selectedDeckId ?? "all",
      resolvedSearchQuery,
    ],
    queryFn: async () => {
      const result = await getFlashcardsManagePage({
        pageIndex,
        pageSize: managePageSize,
        deckId: selectedDeckId,
        search: resolvedSearchQuery,
      });

      if ("errorCode" in result) {
        return { items: [], total: 0, deckCardCount: null };
      }

      return result;
    },
    initialData:
      pageIndex === 0 &&
      (selectedDeckId ?? undefined) === (initialDeckId ?? undefined) &&
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
  const deckCardCount = pageData.deckCardCount ?? 0;
  const isAtDeckLimit =
    selectedDeckId !== undefined &&
    deckCardCount >= LIMITS.maxFlashcardsPerDeck;

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

  function handleValidationStarted(
    issues: FlashcardValidationIssue[],
    flashcards: FlashcardValidationItem[],
  ) {
    setValidationIssues(issues);
    setValidationFlashcards(flashcards);
    setValidationMode(true);
    setValidateDialogOpen(false);
  }

  async function handleValidateAgain() {
    const flashcardIdsToValidate = validationIssues.map((issue) => issue.id);

    if (flashcardIdsToValidate.length === 0) {
      return;
    }

    setIsValidatingAgain(true);

    try {
      const result = await validateFlashcards({
        flashcardIds: flashcardIdsToValidate,
      });

      if ("errorCode" in result) {
        return;
      }

      setValidationIssues(result.issues);
      setValidationFlashcards(result.flashcards);
    } finally {
      setIsValidatingAgain(false);
    }
  }

  async function handleConfirmValidateAgain() {
    setValidateAgainDialogOpen(false);
    await handleValidateAgain();
  }

  function exitValidation() {
    setValidationMode(false);
    setValidationIssues([]);
    setValidationFlashcards([]);
  }

  function removeValidationFlashcard(flashcardId: string) {
    setValidationIssues((prev) =>
      prev.filter((issue) => issue.id !== flashcardId),
    );
    setValidationFlashcards((prev) =>
      prev.filter((card) => card.id !== flashcardId),
    );
  }

  function updateValidationFlashcard(updated: {
    id: string;
    front: string;
    deckName: string;
    deckPath?: string;
    deckId: string;
  }) {
    setValidationFlashcards((prev) =>
      prev.map((card) => (card.id === updated.id ? updated : card)),
    );
  }

  function checkValidationEmpty() {
    setValidationIssues((prev) => {
      if (prev.length === 0) {
        exitValidation();
      }
      return prev;
    });
  }

  return {
    bulkDeleteOpen,
    bulkMoveOpen,
    bulkResetOpen,
    createOpen,
    deleteTarget,
    editFlashcardQuery,
    editingFlashcardId,
    flashcards,
    isAtDeckLimit,
    deckCardCount,
    managePageQuery,
    pageIndex,
    refreshManagePage,
    resetTarget,
    resolvedSearchQuery,
    searchQuery,
    selectedDeckId,
    selectedFlashcardIds,
    setBulkDeleteOpen,
    setBulkMoveOpen,
    setBulkResetOpen,
    setCreateOpen,
    setDeleteTarget,
    setEditingFlashcardId,
    setPageIndex,
    setResetTarget,
    setSearchQuery,
    setSelectedDeckId,
    setSelectedFlashcardIds,
    handleDeckChange,
    total,
    pageSize: managePageSize,
    editingFlashcard: editFlashcardQuery.data,
    validationMode,
    validationIssues,
    validationFlashcards,
    validateDialogOpen,
    setValidateDialogOpen,
    handleValidationStarted,
    handleValidateAgain,
    isValidatingAgain,
    exitValidation,
    validateAgainDialogOpen,
    setValidateAgainDialogOpen,
    handleConfirmValidateAgain,
    removeValidationFlashcard,
    updateValidationFlashcard,
    checkValidationEmpty,
  };
}
