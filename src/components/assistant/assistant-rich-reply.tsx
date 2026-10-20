"use client";

import { lazy, Suspense } from "react";
import { plainTextToRichText } from "@/lib/ai/plain-text-rich-text";

function loadTiptapRenderer() {
  return import("@/components/shared/tiptap-renderer");
}

const TiptapRenderer = lazy(() =>
  loadTiptapRenderer().then((module) => ({ default: module.TiptapRenderer })),
);

/**
 * Start downloading the rich-text renderer ahead of the first finished reply.
 *
 * @example
 * useEffect(preloadAssistantRichReply, []);
 */
export function preloadAssistantRichReply(): void {
  void loadTiptapRenderer();
}

interface AssistantRichReplyProps {
  text: string;
}

/**
 * A finished assistant reply rendered as rich text. The plain text stays on
 * screen while the renderer chunk loads and its editor initializes, so the
 * reply never blanks out between the end of the stream and the rich render.
 *
 * @example
 * <AssistantRichReply text="Use $E = mc^2$." />
 */
export function AssistantRichReply({
  text,
}: Readonly<AssistantRichReplyProps>) {
  const plainReply = <AssistantPlainReply text={text} />;

  return (
    <Suspense fallback={plainReply}>
      <TiptapRenderer
        content={plainTextToRichText(text)}
        fallback={plainReply}
      />
    </Suspense>
  );
}

/**
 * Reply text as typed, used while streaming and as the rich render fallback.
 *
 * @example
 * <AssistantPlainReply text="Hello" />
 */
export function AssistantPlainReply({
  text,
}: Readonly<AssistantRichReplyProps>) {
  return <p className="whitespace-pre-wrap">{text}</p>;
}
