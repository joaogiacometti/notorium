"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getFlashcardForManage } from "@/app/actions/flashcards";
import { DeleteFlashcardDialog } from "@/components/flashcards/delete-flashcard-dialog";
import { FlashcardsManagerTable } from "@/components/flashcards/flashcards-manager-table";
import { FlashcardsManagerToolbar } from "@/components/flashcards/flashcards-manager-toolbar";
import { FlashcardsValidationResults } from "@/components/flashcards/flashcards-validation-results";
import { LazyBulkDeleteFlashcardsDialog as BulkDeleteFlashcardsDialog } from "@/components/flashcards/lazy-bulk-delete-flashcards-dialog";
import { LazyBulkMoveFlashcardsDialog as BulkMoveFlashcardsDialog } from "@/components/flashcards/lazy-bulk-move-flashcards-dialog";
import { LazyCreateFlashcardDialog as CreateFlashcardDialog } from "@/components/flashcards/lazy-create-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/lazy-edit-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/reset-flashcard-dialog";
import { useFlashcardsManagerController } from "@/components/flashcards/use-flashcards-manager-controller";
import { ValidateAgainDialog } from "@/components/flashcards/validate-again-dialog";
import { ValidateFlashcardsDialog } from "@/components/flashcards/validate-flashcards-dialog";
import { Card } from "@/components/ui/card";
import { LIMITS } from "@/lib/config/limits";
import { getFlashcardDetailHref } from "@/lib/navigation/detail-page-back-link";
import type {
  DeckEntity,
  FlashcardManagePage,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface FlashcardsManagerProps {
  initialPageData: FlashcardManagePage;
  subjects: SubjectEntity[];
  decks: DeckEntity[];
  initialSubjectId?: string;
  initialDeckId?: string;
}

export function FlashcardsManager({
  initialPageData,
  subjects,
  decks,
  initialSubjectId,
  initialDeckId,
}: Readonly<FlashcardsManagerProps>) {
  const warningTone = getStatusToneClasses("warning");
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const {
    bulkDeleteOpen,
    bulkMoveOpen,
    createOpen,
    deleteTarget,
    editingFlashcard,
    editingFlashcardId,
    flashcards,
    isAtSubjectLimit,
    managePageQuery,
    pageIndex,
    searchQuery,
    refreshManagePage,
    resetTarget,
    selectedDeckId,
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
    handleDeckChange,
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
    initialSubjectId,
    initialDeckId,
    subjects,
  });
  const hasSubjects = subjects.length > 0;
  const isManageScopeLoading =
    managePageQuery.isFetching && managePageQuery.isPlaceholderData;

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
      <Card className="overflow-hidden border-border/70 bg-card/85 py-0 shadow-none lg:min-h-0 lg:flex-1">
        <FlashcardsManagerTable
          flashcards={flashcards}
          total={total}
          selectedFlashcardIds={selectedFlashcardIds}
          pageIndex={pageIndex}
          pageSize={pageSize}
          isLoading={isManageScopeLoading}
          onEditRequested={setEditingFlashcardId}
          onPageIndexChange={setPageIndex}
          onDeleteRequested={setDeleteTarget}
          onResetRequested={setResetTarget}
          onSelectedFlashcardIdsChange={setSelectedFlashcardIds}
          onRowClick={(row) =>
            startNavTransition(() =>
              router.push(
                getFlashcardDetailHref(row.subjectId, row.id, {
                  from: "flashcards-manage",
                  subjectId: selectedSubjectId,
                }),
              ),
            )
          }
        />
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <FlashcardsManagerToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        hasSubjects={hasSubjects}
        validationMode={validationMode}
        subjects={subjects}
        decks={decks}
        selectedSubjectId={selectedSubjectId}
        selectedDeckId={selectedDeckId}
        isManageScopeLoading={isManageScopeLoading}
        selectedFlashcardIds={selectedFlashcardIds}
        selectedSubjectCardCount={selectedSubjectCardCount}
        total={total}
        validationIssuesCount={validationIssues.length}
        isValidatingAgain={isValidatingAgain}
        onSubjectChange={setSelectedSubjectId}
        onDeckChange={handleDeckChange}
        onOpenValidateDialog={() => setValidateDialogOpen(true)}
        onOpenCreateDialog={() => setCreateOpen(true)}
        onOpenValidateAgainDialog={() => setValidateAgainDialogOpen(true)}
        onExitValidation={exitValidation}
        onOpenBulkMoveDialog={() => setBulkMoveOpen(true)}
        onOpenBulkDeleteDialog={() => setBulkDeleteOpen(true)}
        onClearSelection={() => setSelectedFlashcardIds([])}
      />
      {selectedSubjectId && isAtSubjectLimit && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-xs ${warningTone.border} ${warningTone.bg}`}
        >
          <Lock className={`size-4 shrink-0 ${warningTone.text}`} />
          <p className={warningTone.text}>
            {`You've reached the limit of ${LIMITS.maxFlashcardsPerSubject} flashcards per subject. Please delete existing ones to create more.`}
          </p>
        </div>
      )}
      {renderMainContent()}
      <CreateFlashcardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refreshManagePage}
        subjectId={selectedSubjectId}
        deckId={selectedDeckId}
        subjects={subjects}
      />
      {editingFlashcardId !== null && editingFlashcard && (
        <EditFlashcardDialog
          flashcard={editingFlashcard}
          subjects={subjects}
          open={editingFlashcardId !== null}
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
                  subjectName: existingCard?.subjectName ?? "",
                  subjectId: result.flashcard.subjectId,
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
        onMoved={(_ids, _subjectId) => {
          refreshManagePage();
          setBulkMoveOpen(false);
        }}
        subjects={subjects}
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
      <ValidateFlashcardsDialog
        open={validateDialogOpen}
        onOpenChange={setValidateDialogOpen}
        onValidationStarted={handleValidationStarted}
        subjects={subjects}
        currentSubjectId={selectedSubjectId}
      />
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
