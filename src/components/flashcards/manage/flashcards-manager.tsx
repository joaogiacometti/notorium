"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { getFlashcardForManage } from "@/app/actions/flashcards";
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { LazyCreateFlashcardDialog as CreateFlashcardDialog } from "@/components/flashcards/dialogs/lazy-create-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/dialogs/lazy-edit-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import { FlashcardsManagerTable } from "@/components/flashcards/manage/flashcards-manager-table";
import { FlashcardsManagerToolbar } from "@/components/flashcards/manage/flashcards-manager-toolbar";
import { FlashcardsValidationResults } from "@/components/flashcards/manage/flashcards-validation-results";
import { LazyBulkDeleteFlashcardsDialog as BulkDeleteFlashcardsDialog } from "@/components/flashcards/manage/lazy-bulk-delete-flashcards-dialog";
import { LazyBulkMoveFlashcardsDialog as BulkMoveFlashcardsDialog } from "@/components/flashcards/manage/lazy-bulk-move-flashcards-dialog";
import { LazyBulkResetFlashcardsDialog as BulkResetFlashcardsDialog } from "@/components/flashcards/manage/lazy-bulk-reset-flashcards-dialog";
import { useFlashcardsManagerController } from "@/components/flashcards/manage/use-flashcards-manager-controller";
import { ValidateAgainDialog } from "@/components/flashcards/manage/validate-again-dialog";
import { ValidateFlashcardsDialog } from "@/components/flashcards/manage/validate-flashcards-dialog";
import { Card } from "@/components/ui/card";
import { LIMITS } from "@/lib/config/limits";
import { getFlashcardDetailHref } from "@/lib/navigation/detail-page-back-link";
import type { FlashcardManagePage } from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface FlashcardsManagerProps {
  initialPageData: FlashcardManagePage;
  initialDeckId?: string;
  initialSearch?: string;
  aiEnabled: boolean;
  hasDecks: boolean;
}

export function FlashcardsManager({
  initialPageData,
  initialDeckId,
  initialSearch,
  aiEnabled,
  hasDecks,
}: Readonly<FlashcardsManagerProps>) {
  const warningTone = getStatusToneClasses("warning");
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const {
    bulkDeleteOpen,
    bulkMoveOpen,
    bulkResetOpen,
    createOpen,
    deleteTarget,
    moveTarget,
    editingFlashcard,
    editingFlashcardId,
    flashcards,
    isAtDeckLimit,
    managePageQuery,
    pageIndex,
    searchQuery,
    refreshManagePage,
    resetTarget,
    selectedDeckId,
    selectedFlashcardIds,
    setBulkDeleteOpen,
    setBulkMoveOpen,
    setBulkResetOpen,
    setCreateOpen,
    setDeleteTarget,
    setMoveTarget,
    setEditingFlashcardId,
    setPageIndex,
    setResetTarget,
    setSearchQuery,
    setSelectedFlashcardIds,
    total,
    pageSize,
    validationMode,
    validationIssues,
    validationFlashcards,
    validateDialogOpen,
    setValidateDialogOpen,
    handleValidationStarted,
    validateAgainDialogOpen,
    setValidateAgainDialogOpen,
    handleConfirmValidateAgain,
    isValidatingAgain,
    exitValidation,
    removeValidationFlashcard,
    updateValidationFlashcard,
    checkValidationEmpty,
  } = useFlashcardsManagerController({
    initialPageData,
    initialDeckId,
    initialSearch,
  });
  const isManageScopeLoading =
    managePageQuery.isFetching && managePageQuery.isPlaceholderData;
  const singleMoveIds = useMemo(
    () => (moveTarget ? [moveTarget.id] : null),
    [moveTarget],
  );

  const renderMainContent = () => {
    if (validationMode) {
      return (
        <FlashcardsValidationResults
          issues={validationIssues}
          flashcards={validationFlashcards}
          onEdit={setEditingFlashcardId}
          onDelete={setDeleteTarget}
        />
      );
    }

    return (
      <Card className="min-w-0 overflow-hidden rounded-xl border-border/70 bg-card/85 py-0 shadow-none lg:min-h-0 lg:flex-1">
        <FlashcardsManagerTable
          flashcards={flashcards}
          total={total}
          selectedFlashcardIds={selectedFlashcardIds}
          pageIndex={pageIndex}
          pageSize={pageSize}
          isLoading={isManageScopeLoading}
          onEditRequested={setEditingFlashcardId}
          onMoveRequested={setMoveTarget}
          onPageIndexChange={setPageIndex}
          onDeleteRequested={setDeleteTarget}
          onResetRequested={setResetTarget}
          onSelectedFlashcardIdsChange={setSelectedFlashcardIds}
          onRowClick={(row) =>
            startNavTransition(() =>
              router.push(
                getFlashcardDetailHref(row.id, {
                  from: "flashcards-manage",
                  view: "manage",
                  deckId: selectedDeckId,
                }),
              ),
            )
          }
        />
      </Card>
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:h-full lg:min-h-0">
      <FlashcardsManagerToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        validationMode={validationMode}
        isManageScopeLoading={isManageScopeLoading}
        selectedFlashcardIds={selectedFlashcardIds}
        total={total}
        validationIssuesCount={validationIssues.length}
        isValidatingAgain={isValidatingAgain}
        aiEnabled={aiEnabled}
        hasDecks={hasDecks}
        onOpenValidateDialog={() => setValidateDialogOpen(true)}
        onOpenCreateDialog={() => setCreateOpen(true)}
        onOpenValidateAgainDialog={() => setValidateAgainDialogOpen(true)}
        onExitValidation={exitValidation}
        onOpenBulkMoveDialog={() => setBulkMoveOpen(true)}
        onOpenBulkDeleteDialog={() => setBulkDeleteOpen(true)}
        onOpenBulkResetDialog={() => setBulkResetOpen(true)}
        onClearSelection={() => setSelectedFlashcardIds([])}
      />
      {selectedDeckId && isAtDeckLimit && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-xs ${warningTone.border} ${warningTone.bg}`}
        >
          <Lock className={`size-4 shrink-0 ${warningTone.text}`} />
          <p className={warningTone.text}>
            {`You've reached the limit of ${LIMITS.maxFlashcardsPerDeck} flashcards per deck. Please delete existing ones to create more.`}
          </p>
        </div>
      )}
      {renderMainContent()}
      <CreateFlashcardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refreshManagePage}
        deckId={selectedDeckId}
        aiEnabled={aiEnabled}
      />
      {editingFlashcardId !== null && editingFlashcard && (
        <EditFlashcardDialog
          flashcard={editingFlashcard}
          open={editingFlashcardId !== null}
          aiEnabled={aiEnabled}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingFlashcardId(null);
            }
          }}
          onUpdated={async () => {
            refreshManagePage();
            if (validationMode && editingFlashcardId) {
              const result = await getFlashcardForManage({
                id: editingFlashcardId,
              });
              if (result && !("errorCode" in result)) {
                const existingCard = validationFlashcards.find(
                  (c) => c.id === editingFlashcardId,
                );
                updateValidationFlashcard({
                  id: result.flashcard.id,
                  front: result.flashcard.front,
                  deckName: existingCard?.deckName ?? "",
                  deckPath:
                    existingCard?.deckPath ?? existingCard?.deckName ?? "",
                  deckId: result.flashcard.deckId,
                });
              }
            }
          }}
          onDeleted={(deletedId) => {
            setEditingFlashcardId(null);
            refreshManagePage();
            if (validationMode) {
              removeValidationFlashcard(deletedId);
              checkValidationEmpty();
            }
          }}
        />
      )}
      <BulkDeleteFlashcardsDialog
        ids={selectedFlashcardIds}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onDeleted={(_ids) => {
          refreshManagePage();
          setBulkDeleteOpen(false);
        }}
      />
      <BulkMoveFlashcardsDialog
        ids={selectedFlashcardIds}
        open={bulkMoveOpen}
        onOpenChange={setBulkMoveOpen}
        onMoved={(movedIds) => {
          setSelectedFlashcardIds((currentIds) =>
            currentIds.filter((id) => !movedIds.includes(id)),
          );
          refreshManagePage();
          setBulkMoveOpen(false);
        }}
      />
      {moveTarget && singleMoveIds && (
        <BulkMoveFlashcardsDialog
          ids={singleMoveIds}
          open
          onOpenChange={() => setMoveTarget(null)}
          onMoved={(movedIds) => {
            setSelectedFlashcardIds((currentIds) =>
              currentIds.filter((id) => !movedIds.includes(id)),
            );
            setMoveTarget(null);
            refreshManagePage();
          }}
        />
      )}
      <BulkResetFlashcardsDialog
        ids={selectedFlashcardIds}
        open={bulkResetOpen}
        onOpenChange={setBulkResetOpen}
        onReset={(_ids) => {
          refreshManagePage();
          setBulkResetOpen(false);
        }}
      />
      {deleteTarget && (
        <DeleteFlashcardDialog
          flashcardId={deleteTarget.id}
          flashcardFront={deleteTarget.front}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onDeleted={() => {
            setDeleteTarget(null);
            refreshManagePage();
            if (validationMode) {
              removeValidationFlashcard(deleteTarget.id);
              checkValidationEmpty();
            }
          }}
        />
      )}
      {resetTarget && (
        <ResetFlashcardDialog
          flashcardId={resetTarget.id}
          flashcardFront={resetTarget.front}
          open
          onOpenChange={(open) => {
            if (!open) setResetTarget(null);
          }}
          onReset={() => {
            setResetTarget(null);
            refreshManagePage();
          }}
        />
      )}
      {aiEnabled ? (
        <ValidateFlashcardsDialog
          open={validateDialogOpen}
          onOpenChange={setValidateDialogOpen}
          onValidationStarted={handleValidationStarted}
          currentDeckId={selectedDeckId}
        />
      ) : null}
      <ValidateAgainDialog
        open={validateAgainDialogOpen}
        onOpenChange={setValidateAgainDialogOpen}
        onConfirm={handleConfirmValidateAgain}
        isValidating={isValidatingAgain}
        count={validationIssues.length}
      />
    </div>
  );
}
