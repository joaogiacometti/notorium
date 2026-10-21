"use client";

import { useChat } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createAssistantChatTransport } from "@/components/assistant/assistant-chat-transport";
import {
  type ActiveFlashcardEditor,
  AssistantWorkspaceContext,
  type PendingFlashcardEdits,
} from "@/components/assistant/assistant-workspace-context";
import { useFlashcardProposalOutcomes } from "@/components/assistant/use-flashcard-proposal-outcomes";
import {
  type FlashcardDraft,
  type FlashcardEditField,
  type FlashcardEditsOutput,
  flashcardDraftSchema,
  flashcardEditsInputSchema,
} from "@/features/assistant/edit-contract";
import type { AssistantUIMessage } from "@/features/assistant/types";
import { prepareDraftForAssistant } from "@/features/assistant/utils";

const sharedTransport = createAssistantChatTransport();
const EDIT_FIELDS = ["front", "back"] as const;

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
  const chat = useChat<AssistantUIMessage>({ transport });
  const [composerDraft, setComposerDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const hosts = useRef<HTMLElement[]>([]);
  const portalNodes = useRef<{
    target: HTMLElement;
    fallback: HTMLElement;
  } | null>(null);
  const proposals = useFlashcardProposalOutcomes(chat);
  const [editor, setEditor] = useState<ActiveFlashcardEditor | null>(null);
  const editorRef = useRef(editor);
  const [pending, setPending] = useState<PendingFlashcardEdits | null>(null);
  const pendingRef = useRef(pending);
  const [notice, setNotice] = useState<string | null>(null);
  const requestRef = useRef<FlashcardDraft | null>(null);
  const handled = useRef(new Set<string>());
  const chatGeneration = useRef(0);
  const editors = useRef<ActiveFlashcardEditor[]>([]);
  pendingRef.current = pending;

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

  function record(toolCallId: string, output: FlashcardEditsOutput) {
    return chat.addToolOutput({
      tool: "proposeFlashcardEdits",
      toolCallId,
      output,
    });
  }

  async function settlePending() {
    const current = pendingRef.current;
    if (!current) return;
    const output = { ...current.outcomes };
    for (const field of EDIT_FIELDS) {
      if (current.fields[field]) output[field] = "skipped";
    }
    pendingRef.current = null;
    setPending(null);
    await record(current.toolCallId, output);
  }

  function register(active: ActiveFlashcardEditor) {
    void settlePending();
    editors.current.push(active);
    editorRef.current = active;
    setEditor(active);
    setNotice(null);
    return () => {
      editors.current = editors.current.filter(
        (candidate) => candidate !== active,
      );
      if (editorRef.current !== active) return;
      void settlePending();
      const previous = editors.current.at(-1) ?? null;
      editorRef.current = previous;
      setEditor(previous);
    };
  }

  function decide(field: FlashcardEditField, accept: boolean) {
    const current = pendingRef.current;
    const proposal = current?.fields[field];
    const active = editorRef.current;
    if (!current || !proposal || !active?.available()) return;
    const snapshot = active.snapshot();
    const stale =
      snapshot.sessionId !== current.sessionId ||
      snapshot[field] !== proposal.original;
    if (accept && !stale) active.apply(field, proposal.replacement);
    const fields = { ...current.fields };
    delete fields[field];
    const outcomes = {
      ...current.outcomes,
      [field]: stale
        ? ("stale" as const)
        : accept
          ? ("accepted" as const)
          : ("discarded" as const),
    };
    updatePending({ ...current, fields, outcomes });
  }

  function updatePending(next: PendingFlashcardEdits) {
    if (Object.keys(next.fields).length) {
      pendingRef.current = next;
      setPending(next);
      return;
    }
    record(next.toolCallId, next.outcomes);
    pendingRef.current = null;
    setPending(null);
  }

  async function send(text?: string): Promise<boolean> {
    if (chat.status === "submitted" || chat.status === "streaming")
      return false;
    if (editorRef.current && !editorRef.current.available()) {
      setNotice("Wait for saving or image uploads to finish, then try again.");
      return false;
    }
    try {
      const draft = editorRef.current?.snapshot();
      if (draft && !flashcardDraftSchema.safeParse(draft).success) {
        setNotice("This draft is too large to send. Shorten it and try again.");
        return false;
      }
      await settlePending();
      await proposals.skipOpenCards();
      requestRef.current = draft ?? null;
      setNotice(null);
      const options = {
        body: draft ? { draft: prepareDraftForAssistant(draft) } : {},
      };
      const sending =
        text !== undefined
          ? chat.sendMessage({ text }, options)
          : chat.regenerate(options);
      void sending.catch(() =>
        setNotice("The message could not be sent. Please retry."),
      );
      return true;
    } catch {
      setNotice("The message could not be prepared. Please retry.");
      return false;
    }
  }

  async function receive(toolCallId: string, input: unknown) {
    const generation = chatGeneration.current;
    const baseline = requestRef.current;
    const { restoreDraftReplacement } = await import(
      "@/components/assistant/flashcard-draft-content"
    );
    if (
      generation !== chatGeneration.current ||
      baseline !== requestRef.current
    )
      return;
    const parsed = flashcardEditsInputSchema.safeParse(input);
    const active = editorRef.current;
    const snapshot = active?.snapshot();
    if (!parsed.success) {
      void chat.addToolOutput({
        tool: "proposeFlashcardEdits",
        toolCallId,
        state: "output-error",
        errorText: "Expected valid flashcard field replacements",
      });
      return;
    }
    const proposal = parsed.data;
    const stale =
      !baseline ||
      !snapshot ||
      !active?.available() ||
      proposal.sessionId !== baseline.sessionId ||
      proposal.revision !== baseline.revision ||
      snapshot.sessionId !== baseline.sessionId ||
      snapshot.revision !== baseline.revision;
    if (stale) {
      record(
        toolCallId,
        Object.fromEntries(
          EDIT_FIELDS.filter((field) => proposal[field] !== undefined).map(
            (field) => [field, "stale"],
          ),
        ),
      );
      setNotice(
        "The draft changed before this suggestion arrived. Ask again to use the current draft.",
      );
      return;
    }
    // Clear synchronously so multiple tool calls cannot overwrite unresolved outcomes.
    void settlePending();
    const fields: PendingFlashcardEdits["fields"] = {};
    for (const field of EDIT_FIELDS) {
      if (proposal[field] === undefined) continue;
      fields[field] = {
        original: baseline[field],
        replacement: restoreDraftReplacement(proposal[field], baseline[field]),
      };
    }
    const next = {
      toolCallId,
      sessionId: baseline.sessionId,
      fields,
      outcomes: {},
    };
    pendingRef.current = next;
    setPending(next);
  }

  useEffect(() => {
    if (chat.status === "submitted" || chat.status === "streaming") return;
    for (const message of chat.messages) {
      for (const part of message.parts) {
        if (
          part.type !== "tool-proposeFlashcardEdits" ||
          part.state !== "input-available" ||
          handled.current.has(part.toolCallId)
        )
          continue;
        handled.current.add(part.toolCallId);
        void receive(part.toolCallId, part.input).catch(() => {
          void chat.addToolOutput({
            tool: "proposeFlashcardEdits",
            toolCallId: part.toolCallId,
            state: "output-error",
            errorText: "Expected supported flashcard rich text",
          });
          setNotice("These changes could not be prepared. Ask again to retry.");
        });
      }
    }
  });

  function reset() {
    chatGeneration.current += 1;
    chat.stop();
    void settlePending();
    requestRef.current = null;
    handled.current.clear();
    chat.clearError();
    chat.setMessages([]);
    proposals.reset();
    setNotice(null);
    setComposerDraft("");
  }

  return (
    <AssistantWorkspaceContext
      value={{
        chat,
        open,
        setOpen,
        host,
        registerHost,
        registerPortalTarget,
        composerDraft,
        setComposerDraft,
        proposals,
        editor,
        register,
        pending,
        decide,
        send,
        reset,
        notice,
      }}
    >
      {children}
    </AssistantWorkspaceContext>
  );
}
