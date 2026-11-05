"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { createContext, useContext } from "react";
import type { DocumentEditControls } from "@/components/assistant/document-editor-types";
import type { FlashcardProposalControls } from "@/components/assistant/use-flashcard-proposal-outcomes";
import type {
  FlashcardEditField,
  FlashcardEditsOutput,
  NativeFlashcardDraft,
} from "@/features/assistant/edit-contract";
import type { StudyContext } from "@/features/assistant/study-context";
import type { AssistantUIMessage } from "@/features/assistant/types";
import type { RichTextDocument } from "@/lib/editor/document";

export interface ActiveFlashcardEditor {
  sessionId: string;
  snapshot: () => NativeFlashcardDraft;
  apply: (field: FlashcardEditField, content: RichTextDocument) => void;
  available: () => boolean;
}

export interface PendingFlashcardField {
  original: RichTextDocument;
  replacement: RichTextDocument;
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
  /** Open the panel if needed and move focus to the composer. */
  openComposer: () => void;
  composerFocusRequest: number;
  host: HTMLElement | null;
  registerHost: (host: HTMLElement) => () => void;
  /** Most recently mounted header launcher; focus returns to it on minimize. */
  inlineLauncher: HTMLButtonElement | null;
  registerInlineLauncher: (button: HTMLButtonElement) => () => void;
  registerPortalTarget: (
    target: HTMLElement,
    fallback: HTMLElement,
  ) => () => void;
  proposals: FlashcardProposalControls;
  context: StudyContext | null;
  /** Front assisted during the current review or exam attempt before reveal. */
  assistedRecallFront: string | null;
  clearAssistedRecall: () => void;
  registerContext: (
    snapshot: () => StudyContext | null,
    clearSelection?: () => void,
  ) => () => void;
  /** Drop the active surface's selection, falling back to its wider context. */
  clearContextSelection: () => void;
  refreshContext: () => void;
  editor: ActiveFlashcardEditor | null;
  register: (editor: ActiveFlashcardEditor) => () => void;
  pending: PendingFlashcardEdits | null;
  decide: (field: FlashcardEditField, accept: boolean) => void;
  send: (text?: string) => Promise<boolean>;
  /** Learning support is off until new chat, reload, or `setBypassLearning(false)`. */
  bypassLearning: boolean;
  setBypassLearning: (bypass: boolean) => void;
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
