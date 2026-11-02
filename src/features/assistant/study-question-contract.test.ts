import { describe, expect, it } from "vitest";
import { isStudyAnswerTurn } from "@/features/assistant/study-question-contract";

const question = {
  role: "assistant",
  parts: [
    {
      type: "tool-askStudyQuestion",
      state: "output-available",
      output: {
        question: "Choose an expression.",
        options: ["$u+v$", "$u-v$"],
      },
    },
  ],
};

describe("isStudyAnswerTurn", () => {
  it.each(["A) $u+v$", "a", "B)", "$u-v$"])(
    "recognizes an answer without treating it as permission to end: %s",
    (text) => {
      expect(
        isStudyAnswerTurn([
          question,
          { role: "user", parts: [{ type: "text", text }] },
        ]),
      ).toBe(true);
    },
  );
  it("honors answer-click metadata even if the question is outside the retained history", () => {
    expect(
      isStudyAnswerTurn([
        {
          role: "user",
          metadata: { studyAnswer: true },
          parts: [{ type: "text", text: "Um texto de resposta." }],
        },
      ]),
    ).toBe(true);
  });
  it("leaves explicit exit requests available rather than trapping the learner", () => {
    expect(
      isStudyAnswerTurn([
        question,
        {
          role: "user",
          parts: [{ type: "text", text: "quero encerrar a aula" }],
        },
      ]),
    ).toBe(false);
  });
});
