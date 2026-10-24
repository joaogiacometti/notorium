"use client";

import { useEffect, useRef, useState } from "react";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";

interface DocumentAutosaveOptions<T> {
  documentId: string;
  value: T;
  initialValue: T;
  blocked?: boolean;
  persist: (value: T) => Promise<boolean>;
  onError: () => void;
}

interface AutosaveSession<T> {
  documentId: string;
  value: T;
  savedSnapshot: string;
  blocked: boolean;
  saving: boolean;
  failed: boolean;
  mounted: boolean;
  persist: (value: T) => Promise<boolean>;
  onError: () => void;
  notify: () => void;
}

interface DocumentAutosaveState {
  isSaving: boolean;
  hasError: boolean;
  retry: () => void;
}

export function useDocumentAutosave<T>(
  options: DocumentAutosaveOptions<T>,
): DocumentAutosaveState {
  const session = useAutosaveSession(options);
  const snapshot = JSON.stringify(options.value);
  useAutosaveLifecycle(session);
  useAutosaveTimer(session, snapshot);
  useBeforeUnload(
    snapshot !== session.savedSnapshot || session.saving || session.blocked,
  );
  return {
    isSaving: session.saving,
    hasError: session.failed,
    retry: () => void flushDocumentSession(session),
  };
}

function useAutosaveSession<T>(
  options: DocumentAutosaveOptions<T>,
): AutosaveSession<T> {
  const [, redraw] = useState(0);
  const sessionRef = useRef<AutosaveSession<T> | null>(null);
  if (sessionRef.current?.documentId !== options.documentId) {
    sessionRef.current = createAutosaveSession(options, () =>
      redraw((n) => n + 1),
    );
  }
  const session = sessionRef.current;
  // Each document owns its queue even after teardown; later renders only refresh its pending snapshot.
  Object.assign(session, options, { blocked: options.blocked ?? false });
  return session;
}

function createAutosaveSession<T>(
  options: DocumentAutosaveOptions<T>,
  notify: () => void,
): AutosaveSession<T> {
  return {
    ...options,
    blocked: options.blocked ?? false,
    savedSnapshot: JSON.stringify(options.initialValue),
    saving: false,
    failed: false,
    mounted: false,
    notify,
  };
}

function useAutosaveLifecycle<T>(session: AutosaveSession<T>): void {
  useEffect(() => {
    session.mounted = true;
    return () => {
      session.mounted = false;
      void flushDocumentSession(session);
    };
  }, [session]);
}

function useAutosaveTimer<T>(
  session: AutosaveSession<T>,
  snapshot: string,
): void {
  const wasBlocked = useRef(session.blocked);
  useEffect(() => {
    const uploadFinished = wasBlocked.current && !session.blocked;
    wasBlocked.current = session.blocked;
    if (snapshot === session.savedSnapshot || session.blocked) return;
    const timer = setTimeout(
      () => void flushDocumentSession(session),
      uploadFinished ? 0 : 800,
    );
    return () => clearTimeout(timer);
  }, [session, snapshot, session.blocked]);
}

async function flushDocumentSession<T>(
  session: AutosaveSession<T>,
): Promise<void> {
  if (session.saving || session.blocked) return;
  const value = session.value;
  const snapshot = JSON.stringify(value);
  if (snapshot === session.savedSnapshot) return;
  session.saving = true;
  session.failed = false;
  if (session.mounted) session.notify();
  const succeeded = await persistDocumentSnapshot(session, value);
  session.saving = false;
  session.failed = !succeeded;
  if (succeeded) session.savedSnapshot = snapshot;
  if (session.mounted) session.notify();
  if (JSON.stringify(session.value) !== snapshot)
    await flushDocumentSession(session);
}

async function persistDocumentSnapshot<T>(
  session: AutosaveSession<T>,
  value: T,
): Promise<boolean> {
  try {
    return await session.persist(value);
  } catch {
    session.onError();
    return false;
  }
}
