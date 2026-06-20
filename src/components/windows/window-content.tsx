"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMindmapById } from "@/app/actions/mindmaps";
import { getNoteById } from "@/app/actions/notes";
import { CreateFlashcardFormPanel } from "@/components/flashcards/dialogs/create-flashcard-form-panel";
import { MindmapDetail } from "@/components/mindmaps/mindmap-detail";
import { NoteDetail } from "@/components/notes/note-detail";
import {
  useWindowManager,
  type WindowInstance,
} from "@/components/windows/window-manager-context";
import type {
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
