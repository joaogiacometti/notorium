"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getFlashcardForManage } from "@/app/actions/flashcards";
import { getMindmapById } from "@/app/actions/mindmaps";
import { getNoteById } from "@/app/actions/notes";
import { CreateFlashcardFormPanel } from "@/components/flashcards/dialogs/create-flashcard-form-panel";
import { EditFlashcardDialog } from "@/components/flashcards/dialogs/edit-flashcard-dialog";
import { MindmapDetail } from "@/components/mindmaps/mindmap-detail";
import { NoteDetail } from "@/components/notes/note-detail";
import {
  useWindowManager,
  type WindowInstance,
} from "@/components/windows/window-manager-context";
import { richTextToPlainText } from "@/lib/editor/rich-text";
import type {
  FlashcardEntity,
  MindmapEntity,
  NoteEntity,
  SubjectOption,
} from "@/lib/server/api-contracts";

interface WindowContentProps {
  window: WindowInstance;
  aiEnabled: boolean;
  subjects: SubjectOption[];
}

/**
 * Resolves a window's editor: mindmap/note panes load their document by id and
 * render the existing detail editors in embedded mode; the flashcard pane hosts
 * the reusable create form for quick capture while reading.
 */
export function WindowContent({
  window,
  aiEnabled,
  subjects,
}: Readonly<WindowContentProps>) {
  const { closeWindow, registerCloseRequest } = useWindowManager();
  const onClosed = () => closeWindow(window.id);
  const registerClose = (request: () => void) =>
    registerCloseRequest(window.id, request);

  if (window.kind === "flashcard") {
    if (window.docId) {
      return (
        <FlashcardEditWindowContent
          window={window}
          aiEnabled={aiEnabled}
          onClosed={onClosed}
          registerCloseRequest={registerClose}
        />
      );
    }

    return (
      <CreateFlashcardFormPanel
        aiEnabled={aiEnabled}
        registerCloseRequest={registerClose}
        onOpenChange={(open) => {
          if (!open) {
            onClosed();
          }
        }}
      />
    );
  }

  return (
    <DocumentWindowContent
      window={window}
      aiEnabled={aiEnabled}
      subjects={subjects}
      onClosed={onClosed}
      registerCloseRequest={registerClose}
    />
  );
}

interface FlashcardEditWindowContentProps {
  window: WindowInstance;
  aiEnabled: boolean;
  onClosed: () => void;
  registerCloseRequest: (request: () => void) => () => void;
}

function FlashcardEditWindowContent({
  window,
  aiEnabled,
  onClosed,
  registerCloseRequest,
}: Readonly<FlashcardEditWindowContentProps>) {
  const { setWindowTitle } = useWindowManager();
  const flashcardId = window.docId ?? "";
  const { data, isPending, isError, refetch } =
    useQuery<FlashcardEntity | null>({
      queryKey: ["window-flashcard-edit", flashcardId],
      queryFn: async () => {
        const result = await getFlashcardForManage({ id: flashcardId });
        if ("errorCode" in result) {
          return null;
        }
        return result.flashcard;
      },
      enabled: flashcardId.length > 0,
    });

  useEffect(() => {
    if (data?.front) {
      setWindowTitle(window.id, richTextToPlainText(data.front) || "Flashcard");
    }
  }, [data?.front, window.id, setWindowTitle]);

  if (isPending) {
    return <WindowStatus message="Loading…" />;
  }

  if (isError || !data) {
    return <WindowStatus message="This flashcard could not be found." />;
  }

  return (
    <EditFlashcardDialog
      flashcard={data}
      open
      aiEnabled={aiEnabled}
      noDialog
      registerCloseRequest={registerCloseRequest}
      onOpenChange={(open) => {
        if (!open) {
          onClosed();
        }
      }}
      onUpdated={() => {
        void refetch();
      }}
      onDeleted={onClosed}
    />
  );
}

interface DocumentWindowContentProps {
  window: WindowInstance;
  aiEnabled: boolean;
  subjects: SubjectOption[];
  onClosed: () => void;
  registerCloseRequest: (request: () => void) => () => void;
}

function DocumentWindowContent({
  window,
  aiEnabled,
  subjects,
  onClosed,
  registerCloseRequest,
}: Readonly<DocumentWindowContentProps>) {
  const { setWindowTitle } = useWindowManager();
  const docId = window.docId ?? "";

  const { data, isPending, isError } = useQuery<
    MindmapEntity | NoteEntity | null
  >({
    queryKey: ["window-document", window.kind, docId],
    queryFn: () =>
      window.kind === "mindmap" ? getMindmapById(docId) : getNoteById(docId),
    enabled: docId.length > 0,
    staleTime: 0,
  });

  // Keep the dock chip label in sync with the document's stored title.
  useEffect(() => {
    if (data?.title) {
      setWindowTitle(window.id, data.title);
    }
  }, [data?.title, window.id, setWindowTitle]);

  if (isPending) {
    return <WindowStatus message="Loading…" />;
  }

  if (isError || !data) {
    return <WindowStatus message="This document could not be found." />;
  }

  if (window.kind === "mindmap") {
    return (
      <MindmapDetail
        embedded
        onClosed={onClosed}
        registerCloseRequest={registerCloseRequest}
        aiEnabled={aiEnabled}
        subjects={subjects}
        mindmap={data as MindmapEntity}
        subjectName=""
        subjectHref={null}
      />
    );
  }

  return (
    <NoteDetail
      embedded
      onClosed={onClosed}
      registerCloseRequest={registerCloseRequest}
      aiEnabled={aiEnabled}
      subjects={subjects}
      note={data as NoteEntity}
      subjectName=""
      subjectHref={null}
    />
  );
}

function WindowStatus({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-muted-foreground text-sm">
      {message}
    </div>
  );
}
