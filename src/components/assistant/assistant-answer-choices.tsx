"use client";

import { useRef, useState } from "react";
import type { z } from "zod";
import { AssistantRichReply } from "@/components/assistant/assistant-rich-reply";
import { Button } from "@/components/ui/button";
import type { answerChoicesSchema } from "@/features/assistant/answer-choices-contract";

/** Choices use the same send path as typing, including proposal and error handling. */
export function AssistantAnswerChoices({
  question,
  options,
  disabled,
  onAnswer,
}: Readonly<{
  question: string;
  options: z.infer<typeof answerChoicesSchema>["options"];
  disabled: boolean;
  onAnswer?: (text: string) => Promise<boolean>;
}>) {
  const sending = useRef(false);
  const [selected, setSelected] = useState<number | null>(null);

  async function answer(index: number) {
    if (disabled || sending.current || selected !== null || !onAnswer) return;
    sending.current = true;
    setSelected(index);
    try {
      if (
        !(await onAnswer(
          `${String.fromCharCode(65 + index)}) ${options[index]}`,
        ))
      )
        setSelected(null);
    } finally {
      sending.current = false;
    }
  }

  return (
    <fieldset className="min-w-0 space-y-2 text-sm">
      <legend className="sr-only">{question}</legend>
      <div aria-hidden="true">
        <AssistantRichReply text={question} />
      </div>
      {options.map((option, index) => (
        <div key={option} className="relative">
          <Button
            type="button"
            variant={selected === index ? "secondary" : "outline"}
            className="absolute inset-0 h-full w-full"
            disabled={disabled || selected !== null}
            aria-pressed={selected === index}
            onClick={() => void answer(index)}
          >
            <span className="sr-only">
              {String.fromCharCode(65 + index)}) {option}
            </span>
          </Button>
          <div
            aria-hidden="true"
            className="pointer-events-none relative px-4 py-2"
          >
            <AssistantRichReply
              text={`${String.fromCharCode(65 + index)}) ${option}`}
            />
          </div>
        </div>
      ))}
    </fieldset>
  );
}
