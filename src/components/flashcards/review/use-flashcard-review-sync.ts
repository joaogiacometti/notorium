"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getFlashcardReviewState,
  syncFlashcardReviews,
} from "@/app/actions/flashcard-review";
import {
  type FlashcardReviewSyncStatus,
  getFlashcardReviewScopeKey,
  loadOfflineReviewState,
  loadQueuedReviewEvents,
  type QueuedFlashcardReviewEvent,
  removeQueuedReviewEvents,
  saveOfflineReviewState,
} from "@/features/flashcard-review/offline-store";
import type { FlashcardReviewState } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface UseFlashcardReviewSyncParams {
  selectedDeckId?: string;
  reviewBatchLimit: number;
  isExamMode: boolean;
  isPending: boolean;
  commitReturnedReviewState: (nextState: FlashcardReviewState) => void;
  commitStoredReviewState: (nextState: FlashcardReviewState) => void;
  getCurrentReviewState: () => FlashcardReviewState;
}

/**
 * Owns browser return, offline, and queued review sync state.
 *
 * @example
 * const reviewSync = useFlashcardReviewSync({
 *   selectedDeckId,
 *   reviewBatchLimit,
 *   isExamMode,
 *   isPending,
 *   commitReturnedReviewState,
 *   commitStoredReviewState,
 *   getCurrentReviewState,
 * });
 */
export function useFlashcardReviewSync({
  selectedDeckId,
  reviewBatchLimit,
  isExamMode,
  isPending,
  commitReturnedReviewState,
  commitStoredReviewState,
  getCurrentReviewState,
}: UseFlashcardReviewSyncParams) {
  const [syncStatus, setSyncStatus] =
    useState<FlashcardReviewSyncStatus>("idle");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isReturnSyncBlocking, setIsReturnSyncBlocking] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const isRefreshingOnReturnRef = useRef(false);
  const isSyncingQueuedReviewsRef = useRef(false);
  const reviewScopeKey = getFlashcardReviewScopeKey(selectedDeckId);
  const commitStoredReviewStateEvent = useEffectEvent(commitStoredReviewState);
  const getCurrentReviewStateEvent = useEffectEvent(getCurrentReviewState);

  async function loadQueuedReviewEventsForSync() {
    try {
      const events = await loadQueuedReviewEvents();
      setPendingSyncCount(events.length);
      return events;
    } catch {
      setSyncStatus("error");
      return null;
    }
  }

  async function applyQueuedReviewSyncResult(
    result: Awaited<ReturnType<typeof syncFlashcardReviews>>,
  ) {
    if (!result.success) {
      setSyncStatus("error");
      toast.error(t(result.errorCode, result.errorParams));
      return;
    }

    await removeQueuedReviewEvents(result.appliedClientReviewIds);
    setPendingSyncCount(result.rejectedClientReviewIds.length);
    commitReturnedReviewState(result.reviewState);
    setSyncStatus(result.rejectedClientReviewIds.length > 0 ? "error" : "idle");
  }

  async function syncQueuedReviewEvents(events: QueuedFlashcardReviewEvent[]) {
    setIsReturnSyncBlocking(true);
    setSyncStatus("syncing");
    try {
      const result = await syncFlashcardReviews(
        { events },
        { deckId: selectedDeckId, limit: reviewBatchLimit },
      );

      await applyQueuedReviewSyncResult(result);
    } catch {
      setSyncStatus("error");
      toast.error("Could not sync flashcard reviews. Please try again.");
    } finally {
      setIsReturnSyncBlocking(false);
    }
  }

  const syncQueuedReviews = useEffectEvent(async (forceOnline = false) => {
    if (
      (!isOnline && !forceOnline) ||
      syncStatus === "syncing" ||
      isSyncingQueuedReviewsRef.current
    ) {
      return true;
    }

    isSyncingQueuedReviewsRef.current = true;
    try {
      const events = await loadQueuedReviewEventsForSync();
      if (!events) {
        return true;
      }

      if (events.length === 0) {
        setSyncStatus("idle");
        return false;
      }

      await syncQueuedReviewEvents(events);
      return true;
    } finally {
      isSyncingQueuedReviewsRef.current = false;
    }
  });

  const refreshReviewStateOnReturn = useEffectEvent(async () => {
    if (
      isExamMode ||
      isPending ||
      isReturnSyncBlocking ||
      !isOnline ||
      isRefreshingOnReturnRef.current
    ) {
      return;
    }

    isRefreshingOnReturnRef.current = true;
    try {
      const nextState = await getFlashcardReviewState({
        deckId: selectedDeckId,
        limit: reviewBatchLimit,
      });

      commitReturnedReviewState(nextState);
    } catch {
      toast.error("Could not refresh review progress. Please try again.");
    } finally {
      isRefreshingOnReturnRef.current = false;
    }
  });

  const syncQueuedReviewsOrRefreshOnReturn = useEffectEvent(async () => {
    const handledQueuedReviews = await syncQueuedReviews();
    if (!handledQueuedReviews) {
      await refreshReviewStateOnReturn();
    }
  });

  function markOfflineReviewQueued() {
    setSyncStatus("offline");
    setPendingSyncCount((count) => count + 1);
  }

  useEffect(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    setSyncStatus(online ? "idle" : "offline");
    void loadQueuedReviewEvents()
      .then((events) => setPendingSyncCount(events.length))
      .catch(() => setSyncStatus("error"));
    void saveOfflineReviewState(
      reviewScopeKey,
      getCurrentReviewStateEvent(),
    ).catch(() => {});
  }, [reviewScopeKey]);

  useEffect(() => {
    async function hydrateOfflineState() {
      if (isOnline || getCurrentReviewStateEvent().cards.length > 0) {
        return;
      }

      const storedState = await loadOfflineReviewState(reviewScopeKey);
      if (storedState) {
        commitStoredReviewStateEvent(storedState);
      }
    }

    void hydrateOfflineState();
  }, [isOnline, reviewScopeKey]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      void syncQueuedReviews(true);
    }

    function handleOffline() {
      setIsOnline(false);
      setSyncStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      void syncQueuedReviews(true);
    }
  }, [isOnline]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void syncQueuedReviewsOrRefreshOnReturn();
      }
    }

    function handleWindowFocus() {
      void syncQueuedReviewsOrRefreshOnReturn();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  return {
    isOnline,
    isReturnSyncBlocking,
    markOfflineReviewQueued,
    pendingSyncCount,
    syncStatus,
  };
}
