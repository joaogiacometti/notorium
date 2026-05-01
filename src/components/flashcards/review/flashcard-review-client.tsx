"use client";

import { Loader2 } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  getExamFlashcards,
  getFlashcardReviewState,
  reviewFlashcard,
  syncFlashcardReviews,
} from "@/app/actions/flashcard-review";
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/dialogs/lazy-edit-flashcard-dialog";
import { ExamResultsScreen } from "@/components/flashcards/review/exam-results-screen";
import { FocusModeOverlay } from "@/components/flashcards/review/review-focus-mode-overlay";
import { ReviewHubView } from "@/components/flashcards/review/review-hub-view";
import { useExamSession } from "@/components/flashcards/review/use-exam-session";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { applyOfflineFlashcardReview } from "@/features/flashcard-review/offline-review";
import {
  type FlashcardReviewSyncStatus,
  getFlashcardReviewScopeKey,
  loadOfflineReviewState,
  loadQueuedReviewEvents,
  type QueuedFlashcardReviewEvent,
  queueOfflineReviewEvent,
  removeQueuedReviewEvents,
  saveOfflineReviewState,
} from "@/features/flashcard-review/offline-store";
import { getFlashcardReviewPreviewLabels } from "@/features/flashcard-review/preview";
import {
  getFlashcardReviewShortcutAction,
  isEditableFlashcardReviewKeyboardTarget,
} from "@/features/flashcard-review/shortcuts";
import {
  applyReviewedFlashcardToState,
  mergeFlashcardReviewStates,
  replaceFlashcardInReviewState,
  shouldRefillFlashcardReviewState,
} from "@/features/flashcard-review/state";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type {
  DeckEntity,
  DeckOption,
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface FlashcardReviewClientProps {
  initialState: FlashcardReviewState;
  decks: Array<DeckEntity | DeckOption>;
  deckId?: string;
  embedded?: boolean;
  aiEnabled: boolean;
}

const reviewBatchLimit = 50;

function getExamScopeKey(deckId?: string) {
  return deckId ?? "all";
}

export function FlashcardReviewClient({
  initialState,
  decks,
  deckId,
  embedded = false,
  aiEnabled,
}: Readonly<FlashcardReviewClientProps>) {
  const shortcutsSuspended = useShortcutsDialogOpen();
  const [reviewState, setReviewState] = useState(initialState);
  const reviewStateRef = useRef(initialState);
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<ReviewGrade | null>(null);
  const [syncStatus, setSyncStatus] =
    useState<FlashcardReviewSyncStatus>("idle");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isReturnSyncBlocking, setIsReturnSyncBlocking] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isActionPending, startActionTransition] = useTransition();
  const isPending = isActionPending;
  const refillRequestIdRef = useRef(0);
  const isRefillingRef = useRef(false);
  const [selectedDeckId, setSelectedDeckId] = useState(deckId);
  const [examCards, setExamCards] = useState<FlashcardReviewEntity[] | null>(
    null,
  );
  const [isLoadingExamCards, setIsLoadingExamCards] = useState(false);
  const examScopeRef = useRef<{ deckId?: string }>({});
  const examCardsRequestIdRef = useRef(0);
  const examCardsRequestRef = useRef<{
    scopeKey: string;
    promise: Promise<FlashcardReviewEntity[] | null>;
  } | null>(null);
  const isRefreshingOnReturnRef = useRef(false);
  const isSyncingQueuedReviewsRef = useRef(false);
  const examSession = useExamSession();
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const examSessionData = examSession.session;
  const isExamMode = !!examSessionData;
  const reviewScopeKey = getFlashcardReviewScopeKey(selectedDeckId);

  useEffect(() => {
    setSelectedDeckId(deckId);
  }, [deckId]);

  useEffect(() => {
    if (examScopeRef.current.deckId !== selectedDeckId) {
      setExamCards(null);
      examScopeRef.current = { deckId: selectedDeckId };
      examCardsRequestIdRef.current += 1;
      examCardsRequestRef.current = null;
      setIsLoadingExamCards(false);
    }
  }, [selectedDeckId]);

  async function ensureExamCardsLoaded(): Promise<
    FlashcardReviewEntity[] | null
  > {
    if (examCards !== null) {
      return examCards;
    }

    const scopeKey = getExamScopeKey(selectedDeckId);
    if (examCardsRequestRef.current?.scopeKey === scopeKey) {
      return examCardsRequestRef.current.promise;
    }

    const requestId = examCardsRequestIdRef.current + 1;
    examCardsRequestIdRef.current = requestId;

    setIsLoadingExamCards(true);
    const request = getExamFlashcards({
      deckId: selectedDeckId,
    })
      .then((cards) => {
        if (examCardsRequestIdRef.current === requestId) {
          setExamCards(cards);
        }

        return cards;
      })
      .catch(() => {
        if (examCardsRequestIdRef.current === requestId) {
          toast.error("Could not load exam cards. Please try again.");
        }

        return null;
      })
      .finally(() => {
        if (examCardsRequestIdRef.current === requestId) {
          setIsLoadingExamCards(false);
          examCardsRequestRef.current = null;
        }
      });

    examCardsRequestRef.current = {
      scopeKey,
      promise: request,
    };

    return request;
  }

  const currentCard = isExamMode
    ? examSession.currentCard
    : (reviewState.cards[0] ?? null);
  const hasDueCards = reviewState.summary.dueCount > 0;
  const hasExamCards = reviewState.summary.totalCount > 0;
  const dueBadgeText = `${reviewState.summary.dueCount} due`;
  const examBadgeText = `${reviewState.summary.totalCount} ${
    reviewState.summary.totalCount === 1 ? "card" : "cards"
  }`;
  const examScopeLabel = selectedDeckId
    ? "All cards in deck"
    : "All flashcards";

  const progress = isExamMode
    ? examSession.progress
    : reviewState.summary.totalCount > 0
      ? (reviewState.summary.totalCount - reviewState.summary.dueCount) /
        reviewState.summary.totalCount
      : 0;
  const previewLabels = useMemo(
    () =>
      currentCard
        ? getFlashcardReviewPreviewLabels({
            card: currentCard,
            scheduler: reviewState.scheduler,
          })
        : null,
    [currentCard, reviewState.scheduler],
  );

  function commitReviewState(nextState: FlashcardReviewState) {
    reviewStateRef.current = nextState;
    setReviewState(nextState);
    void saveOfflineReviewState(reviewScopeKey, nextState).catch(() => {});
  }

  function resetFocusViewState() {
    setRevealed(false);
    setEditOpen(false);
    setDeleteOpen(false);
  }

  function commitReturnedReviewState(nextState: FlashcardReviewState) {
    const currentCardId = reviewStateRef.current.cards[0]?.id;
    const nextCardId = nextState.cards[0]?.id;

    commitReviewState(nextState);

    if (currentCardId !== nextCardId) {
      resetFocusViewState();
    }
  }

  function closeFocusMode() {
    examSession.endSession();
    setIsFocusMode(false);
    resetFocusViewState();
  }

  async function handleFlashcardUpdated(
    updatedFlashcard: FlashcardReviewState["cards"][number],
  ) {
    if (isExamMode) {
      examSession.updateCard(updatedFlashcard);
      resetFocusViewState();
      return;
    }

    if (deckId && updatedFlashcard.deckId !== deckId) {
      const nextState = await getFlashcardReviewState({
        deckId: selectedDeckId,
        limit: reviewBatchLimit,
      });

      commitReviewState(nextState);
      resetFocusViewState();
      return;
    }

    commitReviewState(
      replaceFlashcardInReviewState(reviewStateRef.current, updatedFlashcard),
    );
    resetFocusViewState();
  }

  async function handleFlashcardDeleted(deletedId: string) {
    if (isExamMode) {
      examSession.removeCard(deletedId);
      resetFocusViewState();
      return;
    }

    const nextState = {
      ...reviewStateRef.current,
      cards: reviewStateRef.current.cards.filter(
        (card) => card.id !== deletedId,
      ),
      summary: {
        ...reviewStateRef.current.summary,
        dueCount: Math.max(0, reviewStateRef.current.summary.dueCount - 1),
        totalCount: Math.max(0, reviewStateRef.current.summary.totalCount - 1),
      },
    };

    commitReviewState(nextState);
    resetFocusViewState();

    if (shouldRefillFlashcardReviewState(nextState)) {
      void refillReviewState();
    }
  }

  async function refillReviewState(retryCount = 0) {
    if (isRefillingRef.current || !isOnline) {
      return;
    }
    isRefillingRef.current = true;

    try {
      const requestId = refillRequestIdRef.current + 1;
      refillRequestIdRef.current = requestId;

      const nextState = await getFlashcardReviewState({
        deckId: selectedDeckId,
        limit: reviewBatchLimit,
      });

      if (refillRequestIdRef.current !== requestId) {
        return;
      }

      commitReviewState(
        mergeFlashcardReviewStates(
          reviewStateRef.current,
          nextState,
          new Date(),
        ),
      );
    } finally {
      isRefillingRef.current = false;
      if (
        shouldRefillFlashcardReviewState(reviewStateRef.current) &&
        retryCount < 3
      ) {
        void refillReviewState(retryCount + 1);
      }
    }
  }

  function handleStartReviewMode() {
    examSession.endSession();
    resetFocusViewState();
    setIsFocusMode(true);
  }

  async function handleStartExamMode() {
    const cards = examCards ?? (await ensureExamCardsLoaded());

    if (!cards || cards.length === 0) {
      return;
    }

    examSession.startSession(cards, { deckId: selectedDeckId });
    resetFocusViewState();
    setIsFocusMode(true);
  }

  function handleGradeInExamMode(grade: ReviewGrade) {
    if (!currentCard || isPending) {
      return;
    }

    examSession.rateCard(grade);
    resetFocusViewState();
  }

  function handleExitExamMode() {
    if (examSession.hasStarted && !examSession.sessionComplete) {
      setShowExitConfirmation(true);
    } else {
      closeFocusMode();
    }
  }

  function handleConfirmExitExam() {
    setShowExitConfirmation(false);
    closeFocusMode();
  }

  function handleCloseResults() {
    closeFocusMode();
  }

  function handleRetryWeakCards() {
    if (!examSession.session) {
      return;
    }

    const weakCards = examSession.session.cards.filter((_card, index) => {
      const rating = examSession.session?.ratings[index];
      return rating === "again" || rating === "hard";
    });

    if (weakCards.length === 0) {
      return;
    }

    examSession.startSession(weakCards, { deckId: selectedDeckId });
    resetFocusViewState();
    setIsFocusMode(true);
  }

  function handleGrade(grade: ReviewGrade) {
    if (isExamMode) {
      handleGradeInExamMode(grade);
      return;
    }

    if (!currentCard || isPending) {
      return;
    }

    if (!isOnline) {
      void handleOfflineGrade(currentCard, grade);
      return;
    }

    setPendingGrade(grade);
    startActionTransition(async () => {
      try {
        const result = await reviewFlashcard({
          id: currentCard.id,
          grade,
          clientReviewId: crypto.randomUUID(),
        });

        if (!result.success) {
          toast.error(t(result.errorCode, result.errorParams));
          return;
        }

        const nextState = applyReviewedFlashcardToState(
          reviewStateRef.current,
          result.reviewedCardId,
          result.flashcard,
        );

        commitReviewState(nextState);
        resetFocusViewState();

        if (shouldRefillFlashcardReviewState(nextState)) {
          void refillReviewState();
        }
      } finally {
        setPendingGrade(null);
      }
    });
  }

  async function handleOfflineGrade(
    card: FlashcardReviewEntity,
    grade: ReviewGrade,
  ) {
    const reviewedAt = new Date();
    const clientReviewId = crypto.randomUUID();
    const nextState = applyOfflineFlashcardReview({
      state: reviewStateRef.current,
      card,
      grade,
      reviewedAt,
    });

    commitReviewState(nextState);
    resetFocusViewState();
    setSyncStatus("offline");
    setPendingSyncCount((count) => count + 1);

    await queueOfflineReviewEvent({
      clientReviewId,
      flashcardId: card.id,
      grade,
      reviewedAt,
    });
  }

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

  const syncQueuedReviewsOrRefreshOnReturn = useEffectEvent(async () => {
    const handledQueuedReviews = await syncQueuedReviews();
    if (!handledQueuedReviews) {
      await refreshReviewStateOnReturn();
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

  const handleReviewKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (shortcutsSuspended) {
      return;
    }

    if (isFocusMode && event.key === "Escape") {
      event.preventDefault();
      if (isExamMode) {
        handleExitExamMode();
      } else {
        setIsFocusMode(false);
      }
      return;
    }

    if (!isFocusMode) {
      return;
    }

    const action = getFlashcardReviewShortcutAction({
      key: event.key,
      revealed,
      hasCurrentCard: currentCard !== null,
      isPending,
      isDialogOpen: editOpen || deleteOpen,
      isEditableTarget: isEditableFlashcardReviewKeyboardTarget(event.target),
      hasModifierKey: event.altKey || event.ctrlKey || event.metaKey,
      isRepeat: event.repeat,
    });

    if (!action) {
      return;
    }

    event.preventDefault();

    if (action.type === "reveal") {
      setRevealed(true);
      return;
    }

    if (action.type === "edit") {
      setEditOpen(true);
      return;
    }

    if (action.type === "delete") {
      setDeleteOpen(true);
      return;
    }

    handleGrade(action.grade);
  });

  useEffect(() => {
    document.addEventListener("keydown", handleReviewKeyDown);

    return () => document.removeEventListener("keydown", handleReviewKeyDown);
  }, []);

  useEffect(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    setSyncStatus(online ? "idle" : "offline");
    void loadQueuedReviewEvents()
      .then((events) => setPendingSyncCount(events.length))
      .catch(() => setSyncStatus("error"));
    void saveOfflineReviewState(reviewScopeKey, reviewStateRef.current).catch(
      () => {},
    );
  }, [reviewScopeKey]);

  useEffect(() => {
    async function hydrateOfflineState() {
      if (isOnline || reviewStateRef.current.cards.length > 0) {
        return;
      }

      const storedState = await loadOfflineReviewState(reviewScopeKey);
      if (storedState) {
        reviewStateRef.current = storedState;
        setReviewState(storedState);
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

  const isReviewActionBlocked = isPending || isReturnSyncBlocking;
  const content = (
    <div className="relative min-h-0">
      <ReviewHubView
        hasDueCards={hasDueCards}
        dueBadgeText={dueBadgeText}
        hasExamCards={hasExamCards}
        examBadgeText={examBadgeText}
        examScopeLabel={examScopeLabel}
        isLoadingExamCards={isLoadingExamCards}
        isPending={isReviewActionBlocked}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        isOnline={isOnline}
        onStartReview={handleStartReviewMode}
        onStartExam={handleStartExamMode}
      />
      {isReturnSyncBlocking ? <ReturnSyncBlockingOverlay /> : null}
    </div>
  );

  if (isFocusMode) {
    return (
      <>
        <FocusModeOverlay
          currentCard={currentCard}
          reviewState={reviewState}
          decks={decks}
          progress={progress}
          revealed={revealed}
          isPending={isReviewActionBlocked}
          pendingGrade={pendingGrade}
          syncStatus={syncStatus}
          pendingSyncCount={pendingSyncCount}
          previewLabels={previewLabels}
          onReveal={() => setRevealed(true)}
          onGrade={handleGrade}
          onExitFocusMode={
            isExamMode ? handleExitExamMode : () => setIsFocusMode(false)
          }
          isExamMode={isExamMode}
          examCurrentIndex={examSessionData?.currentIndex ?? 0}
          examTotalCards={examSessionData?.cards.length ?? 0}
        />
        {isReturnSyncBlocking ? (
          <ReturnSyncBlockingOverlay placement="fixed" />
        ) : null}
        {currentCard ? (
          <>
            <EditFlashcardDialog
              key={currentCard.id}
              flashcard={currentCard}
              open={editOpen}
              onOpenChange={setEditOpen}
              aiEnabled={aiEnabled}
              onUpdated={handleFlashcardUpdated}
              onDeleted={handleFlashcardDeleted}
              className="z-120"
              overlayClassName="z-120"
            />
            <DeleteFlashcardDialog
              flashcardId={currentCard.id}
              flashcardFront={currentCard.front}
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              onDeleted={handleFlashcardDeleted}
              className="z-120"
              overlayClassName="z-120"
            />
          </>
        ) : null}
        {examSession.sessionComplete && examSessionData ? (
          <ExamResultsScreen
            totalCards={examSessionData.cards.length}
            ratings={examSessionData.ratings}
            duration={Math.floor(
              (Date.now() - examSessionData.startedAt.getTime()) / 1000,
            )}
            onClose={handleCloseResults}
            onRetryWeak={handleRetryWeakCards}
          />
        ) : null}
        <Dialog
          open={showExitConfirmation}
          onOpenChange={setShowExitConfirmation}
        >
          <DialogContent
            className="z-120 sm:max-w-md"
            overlayClassName="z-120"
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Exit Exam</DialogTitle>
              <DialogDescription>
                Are you sure you want to exit? Your progress won&apos;t be
                saved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setShowExitConfirmation(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmExitExam}>
                Exit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return embedded ? (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto">
      {content}
    </div>
  ) : (
    <AppPageContainer>{content}</AppPageContainer>
  );
}

interface ReturnSyncBlockingOverlayProps {
  placement?: "absolute" | "fixed";
}

function ReturnSyncBlockingOverlay({
  placement = "absolute",
}: Readonly<ReturnSyncBlockingOverlayProps>) {
  const placementClassName =
    placement === "fixed" ? "fixed inset-0 z-120" : "absolute inset-0 z-20";

  return (
    <output
      aria-live="polite"
      aria-label="Syncing flashcards"
      className={`${placementClassName} flex items-center justify-center rounded-xl border border-border/70 bg-background/85 p-6 backdrop-blur-sm`}
      data-testid="flashcard-return-sync-blocker"
    >
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Syncing flashcards...</span>
      </div>
    </output>
  );
}
