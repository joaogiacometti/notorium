"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { LazyCreateFlashcardDialog as CreateFlashcardDialog } from "@/components/flashcards/dialogs/lazy-create-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import { FlashcardsManagerReadFailure } from "@/components/flashcards/manage/flashcards-manager-read-failure";
import { FlashcardsManagerTable } from "@/components/flashcards/manage/flashcards-manager-table";
import { FlashcardsManagerToolbar } from "@/components/flashcards/manage/flashcards-manager-toolbar";
import { FlashcardsRefineResults } from "@/components/flashcards/manage/flashcards-refine-results";
import { LazyBulkDeleteFlashcardsDialog as BulkDeleteFlashcardsDialog } from "@/components/flashcards/manage/lazy-bulk-delete-flashcards-dialog";
import { LazyBulkMoveFlashcardsDialog as BulkMoveFlashcardsDialog } from "@/components/flashcards/manage/lazy-bulk-move-flashcards-dialog";
import { LazyBulkResetFlashcardsDialog as BulkResetFlashcardsDialog } from "@/components/flashcards/manage/lazy-bulk-reset-flashcards-dialog";
import { useFlashcardCopy } from "@/components/flashcards/manage/use-flashcard-copy";
import { useFlashcardsManagerController } from "@/components/flashcards/manage/use-flashcards-manager-controller";
import { toggleStudyLater } from "@/components/flashcards/shared/toggle-study-later";
import { Card } from "@/components/ui/card";
import type { FlashcardManageFilter } from "@/features/flashcards/validation";
import { LIMITS } from "@/lib/config/limits";
import { getFlashcardDetailHref } from "@/lib/navigation/detail-page-back-link";
import type { FlashcardManagePage } from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface FlashcardsManagerProps {
  initialPageData: FlashcardManagePage;
  initialSubjectId?: string;
  initialSearch?: string;
  initialFilter?: FlashcardManageFilter;
  initialPageSize: number;
  aiEnabled: boolean;
}

export function FlashcardsManager({
  initialPageData,
  initialSubjectId,
  initialSearch,
  initialFilter,
  initialPageSize,
  aiEnabled,
}: Readonly<FlashcardsManagerProps>) {
  const warningTone = getStatusToneClasses("warning");
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const { isCopying, copyFlashcardsById, copySelectedFlashcards } =
    useFlashcardCopy();
  const {
    dialog,
    flashcards,
    isAtSubjectLimit,
    managePageQuery,
    pageIndex,
    searchQuery,
    refreshManagePage,
    selectedSubjectId,
    selectedFlashcardIds,
    filter,
    setFilter,
    setDialog,
    setPageIndex,
    setPageSize,
    setSearchQuery,
    setSelectedFlashcardIds,
    total,
    pageSize,
    refineMode,
    strugglingCards,
    isLoadingStrugglingCards,
    startRefineMode,
    refreshStrugglingCards,
    exitRefine,
  } = useFlashcardsManagerController({
    initialPageData,
    initialSubjectId,
    initialSearch,
    initialFilter,
    initialPageSize,
  });
  const isManageScopeLoading =
    managePageQuery.isFetching && managePageQuery.isPlaceholderData;
  const moveTarget = dialog?.kind === "move" ? dialog.target : null;
  const singleMoveIds = useMemo(
    () => (moveTarget ? [moveTarget.id] : null),
    [moveTarget],
  );

  function openFlashcardDetail(flashcardId: string) {
    startNavTransition(() =>
      router.push(
        getFlashcardDetailHref(flashcardId, {
          from: "flashcards-manage",
          view: "manage",
          subjectId: selectedSubjectId,
        }),
      ),
    );
  }

  const renderMainContent = () => {
    if (refineMode) {
      return (
        <FlashcardsRefineResults
          cards={strugglingCards}
          onRefineApplied={() => {
            void refreshStrugglingCards();
            refreshManagePage();
          }}
        />
      );
    }

    if (managePageQuery.isError) {
      return (
        <FlashcardsManagerReadFailure
          message="Could not load flashcards. Retry to refresh the list."
          retrying={managePageQuery.isFetching}
          onRetry={() => void managePageQuery.refetch()}
        />
      );
    }

    return (
      <Card className="h-[clamp(22rem,58svh,36rem)] min-w-0 overflow-hidden rounded-lg border-border bg-card py-0 lg:h-auto lg:min-h-0 lg:flex-1">
        <FlashcardsManagerTable
          flashcards={flashcards}
          total={total}
          selectedFlashcardIds={selectedFlashcardIds}
          pageIndex={pageIndex}
          pageSize={pageSize}
          isLoading={isManageScopeLoading}
          onCopyRequested={(flashcardId) =>
            void copyFlashcardsById([flashcardId])
          }
          onMoveRequested={(target) => setDialog({ kind: "move", target })}
          onPageIndexChange={setPageIndex}
          onPageSizeChange={setPageSize}
          onDeleteRequested={(target) => setDialog({ kind: "delete", target })}
          onResetRequested={(target) => setDialog({ kind: "reset", target })}
          onStudyLaterToggleRequested={(item) =>
            void toggleStudyLater(item, () => refreshManagePage())
          }
          onSelectedFlashcardIdsChange={setSelectedFlashcardIds}
          onRowClick={(row) => openFlashcardDetail(row.id)}
        />
      </Card>
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:h-full lg:min-h-0">
      <FlashcardsManagerToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        isManageScopeLoading={isManageScopeLoading}
        hasManageScopeError={managePageQuery.isError}
        selectedFlashcardIds={
          managePageQuery.isError ? [] : selectedFlashcardIds
        }
        total={total}
        refineMode={refineMode}
        studyLaterFilterActive={filter === "studyLater"}
        onToggleStudyLaterFilter={() =>
          setFilter(filter === "studyLater" ? undefined : "studyLater")
        }
        strugglingCount={strugglingCards.length}
        isLoadingStrugglingCards={isLoadingStrugglingCards}
        aiEnabled={aiEnabled}
        isCopyingSelection={isCopying}
        onCopySelection={() =>
          void copySelectedFlashcards(flashcards, selectedFlashcardIds)
        }
        onOpenCreateDialog={() => setDialog({ kind: "create" })}
        onStartRefine={() => void startRefineMode()}
        onRefreshRefine={() => void refreshStrugglingCards()}
        onExitRefine={exitRefine}
        onOpenBulkMoveDialog={() => setDialog({ kind: "bulk-move" })}
        onOpenBulkDeleteDialog={() => setDialog({ kind: "bulk-delete" })}
        onOpenBulkResetDialog={() => setDialog({ kind: "bulk-reset" })}
        onClearSelection={() => setSelectedFlashcardIds([])}
      />
      {selectedSubjectId && isAtSubjectLimit && (
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${warningTone.border} ${warningTone.bg}`}
        >
          <Lock className={`size-4 shrink-0 ${warningTone.text}`} />
          <p className={warningTone.text}>
            {`You've reached the limit of ${LIMITS.maxFlashcardsPerSubject} flashcards per subject. Please delete existing ones to create more.`}
          </p>
        </div>
      )}
      {renderMainContent()}
      <CreateFlashcardDialog
        open={dialog?.kind === "create"}
        onOpenChange={(open) => setDialog(open ? { kind: "create" } : null)}
        onCreated={refreshManagePage}
        subjectId={selectedSubjectId}
        aiEnabled={aiEnabled}
      />
      <BulkDeleteFlashcardsDialog
        ids={selectedFlashcardIds}
        open={dialog?.kind === "bulk-delete"}
        onOpenChange={(open) =>
          setDialog(open ? { kind: "bulk-delete" } : null)
        }
        onDeleted={(_ids) => {
          refreshManagePage();
          setDialog(null);
        }}
      />
      <BulkMoveFlashcardsDialog
        ids={selectedFlashcardIds}
        open={dialog?.kind === "bulk-move"}
        onOpenChange={(open) => setDialog(open ? { kind: "bulk-move" } : null)}
        onMoved={(movedIds) => {
          setSelectedFlashcardIds((currentIds) =>
            currentIds.filter((id) => !movedIds.includes(id)),
          );
          refreshManagePage();
          setDialog(null);
        }}
      />
      {moveTarget && singleMoveIds && (
        <BulkMoveFlashcardsDialog
          ids={singleMoveIds}
          open
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          onMoved={(movedIds) => {
            setSelectedFlashcardIds((currentIds) =>
              currentIds.filter((id) => !movedIds.includes(id)),
            );
            setDialog(null);
            refreshManagePage();
          }}
        />
      )}
      <BulkResetFlashcardsDialog
        ids={selectedFlashcardIds}
        open={dialog?.kind === "bulk-reset"}
        onOpenChange={(open) => setDialog(open ? { kind: "bulk-reset" } : null)}
        onReset={(_ids) => {
          refreshManagePage();
          setDialog(null);
        }}
      />
      {dialog?.kind === "delete" && (
        <DeleteFlashcardDialog
          flashcardId={dialog.target.id}
          flashcardFront={dialog.target.front}
          open
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          onDeleted={() => {
            setDialog(null);
            refreshManagePage();
          }}
        />
      )}
      {dialog?.kind === "reset" && (
        <ResetFlashcardDialog
          flashcardId={dialog.target.id}
          flashcardFront={dialog.target.front}
          open
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          onReset={() => {
            setDialog(null);
            refreshManagePage();
          }}
        />
      )}
    </div>
  );
}
