"use client";

import { useChat } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import { type ReactNode, useRef, useState } from "react";
import { createAssistantChatTransport } from "@/components/assistant/assistant-chat-transport";
import { AssistantWorkspaceContext } from "@/components/assistant/assistant-workspace-context";
import { useDocumentEditWorkspace } from "@/components/assistant/use-document-edit-workspace";
import { useFlashcardEditWorkspace } from "@/components/assistant/use-flashcard-edit-workspace";
import { useFlashcardProposalOutcomes } from "@/components/assistant/use-flashcard-proposal-outcomes";
import { flashcardDraftSchema } from "@/features/assistant/edit-contract";
import {
  type StudyContext,
  studyContextSchema,
} from "@/features/assistant/study-context";
import type { AssistantUIMessage } from "@/features/assistant/types";
import {
  isAssistantReplyInFlight,
  prepareDraftForAssistant,
  readStudyContextSource,
  stampLastUserMetadata,
} from "@/features/assistant/utils";

const sharedTransport = createAssistantChatTransport();

interface RegisteredContext {
  snapshot: () => StudyContext | null;
  clearSelection?: () => void;
}

interface AssistantWorkspaceProviderProps {
  children: ReactNode;
  transport?: ChatTransport<AssistantUIMessage>;
}

/** Own the conversation independently of floating or editor presentation.
 * @example <AssistantWorkspaceProvider>{app}</AssistantWorkspaceProvider>
 */
export function AssistantWorkspaceProvider({
  children,
  transport = sharedTransport,
}: Readonly<AssistantWorkspaceProviderProps>) {
  const contexts = useRef<RegisteredContext[]>([]);
  const [context, setContext] = useState<StudyContext | null>(null);
  const [assistedRecallFront, setAssistedRecallFront] = useState<string | null>(
    null,
  );
  const contextCallbacks = useRef({
    clearAssistedRecall: () => setAssistedRecallFront(null),
    refreshContext: () =>
      setContext(contexts.current.at(-1)?.snapshot() ?? null),
    clearContextSelection: () => contexts.current.at(-1)?.clearSelection?.(),
    registerContext: (
      snapshot: () => StudyContext | null,
      clearSelection?: () => void,
    ) => {
      contexts.current.push({ snapshot, clearSelection });
      setContext(snapshot());
      return () => {
        contexts.current = contexts.current.filter(
          (entry) => entry.snapshot !== snapshot,
        );
        setContext(contexts.current.at(-1)?.snapshot() ?? null);
      };
    },
  }).current;
  const chat = useChat<AssistantUIMessage>({ transport });
  const [composerDraft, setComposerDraft] = useState("");
  const [bypassLearning, setBypassLearningState] = useState(false);
  // Read when sending: `/bypass <request>` turns it on and sends in one event.
  const bypassLearningRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [composerFocusRequest, setComposerFocusRequest] = useState(0);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const hosts = useRef<HTMLElement[]>([]);
  // A stack, so closing a dialog's launcher hands focus back to the page's.
  const [inlineLaunchers, setInlineLaunchers] = useState<HTMLButtonElement[]>(
    [],
  );
  const portalNodes = useRef<{
    target: HTMLElement;
    fallback: HTMLElement;
  } | null>(null);
  const proposals = useFlashcardProposalOutcomes(chat);
  const flashcards = useFlashcardEditWorkspace(chat);
  const documents = useDocumentEditWorkspace(
    chat,
    !flashcards.editor && context?.kind !== "review",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const chatGeneration = useRef(0);
  const preparingMessage = useRef(false);
  const lastPdfSelection = useRef<string | null>(null);

  function movePortalToActiveHost() {
    const nodes = portalNodes.current;
    const destination = hosts.current.at(-1) ?? nodes?.fallback;
    if (nodes && destination && nodes.target.parentNode !== destination)
      destination.append(nodes.target);
  }

  function registerPortalTarget(target: HTMLElement, fallback: HTMLElement) {
    portalNodes.current = { target, fallback };
    movePortalToActiveHost();
    return () => {
      if (portalNodes.current?.target === target) portalNodes.current = null;
    };
  }

  function registerInlineLauncher(button: HTMLButtonElement) {
    setInlineLaunchers((current) => [
      ...current.filter((candidate) => candidate !== button),
      button,
    ]);
    return () =>
      setInlineLaunchers((current) =>
        current.filter((candidate) => candidate !== button),
      );
  }

  function registerHost(element: HTMLElement) {
    hosts.current.push(element);
    // Move before Radix's passive hideOthers effect, including its aria-live exclusions.
    movePortalToActiveHost();
    setHost(element);
    return () => {
      hosts.current = hosts.current.filter(
        (candidate) => candidate !== element,
      );
      movePortalToActiveHost();
      setHost(hosts.current.at(-1) ?? null);
    };
  }

  function openComposer() {
    setOpen(true);
    setComposerFocusRequest((request) => request + 1);
  }

  function setBypassLearning(bypass: boolean) {
    bypassLearningRef.current = bypass;
    setBypassLearningState(bypass);
  }

  async function send(text?: string): Promise<boolean> {
    if (isAssistantReplyInFlight(chat.status) || preparingMessage.current)
      return false;
    const generation = chatGeneration.current;
    if (flashcards.active() && !flashcards.active()?.available()) {
      setNotice("Wait for saving or image uploads to finish, then try again.");
      return false;
    }
    preparingMessage.current = true;
    try {
      const draft = flashcards.active()?.snapshot();
      const documentDraft = documents.capture();
      const studyContext =
        draft || documentDraft
          ? undefined
          : (contexts.current.at(-1)?.snapshot() ?? undefined);
      const modelDraft = draft ? prepareDraftForAssistant(draft) : undefined;
      if (modelDraft && !flashcardDraftSchema.safeParse(modelDraft).success) {
        setNotice("This draft is too large to send. Shorten it and try again.");
        return false;
      }
      if (studyContext && !studyContextSchema.safeParse(studyContext).success) {
        setNotice(
          "This content could not be included. Check its title and size, then try again.",
        );
        return false;
      }
      flashcards.capture(draft ?? null);
      await flashcards.settle();
      await documents.settle();
      await proposals.skipOpenCards();
      if (generation !== chatGeneration.current) return false;
      if (studyContext?.kind === "review" && studyContext.hiddenBack) {
        setAssistedRecallFront(studyContext.front);
      }
      setNotice(null);
      const selection =
        studyContext?.kind === "pdf" && studyContext.scope === "selection"
          ? JSON.stringify([
              studyContext.documentId,
              studyContext.title,
              studyContext.page,
              studyContext.content,
            ])
          : null;
      const requestContext =
        selection && studyContext?.kind === "pdf"
          ? {
              ...studyContext,
              selectionChanged: selection !== lastPdfSelection.current,
            }
          : studyContext;
      const options = {
        body: {
          ...(bypassLearningRef.current ? { bypassLearning: true } : {}),
          ...(draft
            ? { draft: modelDraft }
            : documentDraft
              ? { documentDraft }
              : { context: requestContext }),
        },
      };
      const metadata = {
        source: readStudyContextSource(
          draft
            ? undefined
            : (contexts.current.at(-1)?.snapshot() ?? undefined),
        ),
      };
      if (text === undefined) {
        chat.setMessages((messages) =>
          stampLastUserMetadata(messages, metadata),
        );
      }
      const sending =
        text !== undefined
          ? chat.sendMessage({ text, metadata }, options)
          : chat.regenerate(options);
      lastPdfSelection.current = selection;
      void sending.catch(() => {
        if (generation === chatGeneration.current)
          setNotice("The message could not be sent. Please retry.");
      });
      return true;
    } catch {
      if (generation === chatGeneration.current)
        setNotice("The message could not be prepared. Please retry.");
      return false;
    } finally {
      preparingMessage.current = false;
    }
  }

  function reset() {
    chatGeneration.current += 1;
    chat.stop();
    documents.reset();
    flashcards.reset();
    lastPdfSelection.current = null;
    chat.clearError();
    chat.setMessages([]);
    proposals.reset();
    setNotice(null);
    setComposerDraft("");
    setBypassLearning(false);
  }

  return (
    <AssistantWorkspaceContext
      value={{
        chat,
        documents,
        open,
        setOpen,
        openComposer,
        composerFocusRequest,
        host,
        registerHost,
        inlineLauncher: inlineLaunchers.at(-1) ?? null,
        registerInlineLauncher,
        registerPortalTarget,
        composerDraft,
        setComposerDraft,
        proposals,
        context,
        assistedRecallFront,
        ...contextCallbacks,
        editor: flashcards.editor,
        register: flashcards.register,
        pending: flashcards.pending,
        decide: flashcards.decide,
        send,
        bypassLearning,
        setBypassLearning,
        reset,
        notice: notice ?? flashcards.notice ?? documents.notice,
      }}
    >
      {children}
    </AssistantWorkspaceContext>
  );
}
