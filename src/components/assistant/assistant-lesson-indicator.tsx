"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssistantUIMessage } from "@/features/assistant/types";
import { readActiveGuidedLesson } from "@/features/assistant/utils";

/**
 * Shows the active guided lesson, started by `/learn` or a request to be
 * taught. Exit is immediate; the closing summary uses one assistant reply.
 *
 * @example
 * <AssistantLessonIndicator chat={workspace.chat} onEnd={workspace.finishLesson} />
 */
export function AssistantLessonIndicator({
  chat,
  onEnd,
}: Readonly<{
  chat: UseChatHelpers<AssistantUIMessage>;
  onEnd: () => Promise<void>;
}>) {
  const lesson = readActiveGuidedLesson(chat.messages);
  if (!lesson) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b bg-primary/10 px-4 py-1.5 text-xs"
    >
      <GraduationCap className="size-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 truncate">
        <span className="font-medium">Guided lesson</span>
        <span className="text-muted-foreground"> · {lesson.topic}</span>
      </p>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        title="End the lesson and generate a summary (uses one assistant reply)"
        onClick={() => void onEnd()}
      >
        <X />
        End lesson
      </Button>
    </div>
  );
}
