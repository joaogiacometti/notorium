"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { createContext, useContext } from "react";
import type { DocumentEditControls } from "@/components/assistant/document-editor-types";
import type { FlashcardProposalControls } from "@/components/assistant/use-flashcard-proposal-outcomes";
import type {
  FlashcardDraft,
  FlashcardEditField,
  FlashcardEditsOutput,
} from "@/features/assistant/edit-contract";
import type { StudyContext } from "@/features/assistant/study-context";
import type { AssistantUIMessage } from "@/features/assistant/types";

export interface ActiveFlashcardEditor {
  sessionId: string;
  snapshot: () => FlashcardDraft;
  apply: (field: FlashcardEditField, html: string) => void;
  available: () => boolean;
}

export interface PendingFlashcardField {
  original: string;
  replacement: string;
}

export interface PendingFlashcardEdits {
  toolCallId: string;
  sessionId: string;
  fields: Partial<Record<FlashcardEditField, PendingFlashcardField>>;
  outcomes: FlashcardEditsOutput;
}

export interface AssistantWorkspace {
  chat: UseChatHelpers<AssistantUIMessage>;
  documents: DocumentEditControls;
  composerDraft: string;
  setComposerDraft: (draft: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  host: HTMLElement | null;
  registerHost: (host: HTMLElement) => () => void;
  registerPortalTarget: (
    target: HTMLElement,
    fallback: HTMLElement,
  ) => () => void;
  proposals: FlashcardProposalControls;
  context: StudyContext | null;
  registerContext: (snapshot: () => StudyContext | null) => () => void;
  refreshContext: () => void;
  editor: ActiveFlashcardEditor | null;
  register: (editor: ActiveFlashcardEditor) => () => void;
  pending: PendingFlashcardEdits | null;
  decide: (field: FlashcardEditField, accept: boolean) => void;
  send: (text?: string) => Promise<boolean>;
  reset: () => void;
  notice: string | null;
}

export const AssistantWorkspaceContext =
  createContext<AssistantWorkspace | null>(null);

/** Access the shared conversation when mounted in the authenticated shell.
 * @example const workspace = useAssistantWorkspace();
 */
export function useAssistantWorkspace(): AssistantWorkspace | null {
  return useContext(AssistantWorkspaceContext);
}
