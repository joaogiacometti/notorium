import { expect } from "vitest";
import { activeLesson, conversation } from "./fixtures";
import { runAssistantEvals } from "./harness";

const PIZZA_QUESTION =
  "A pizza is cut into 4 equal slices and you take 3. What fraction did you take?";

runAssistantEvals("lessons", [
  {
    name: "a correct answer gets feedback and does not end the lesson",
    messages: activeLesson("Fractions", PIZZA_QUESTION, "3/4"),
    check: (reply) => {
      expect(reply.toolNames).not.toContain("endGuidedLesson");
      expect(reply.text).not.toBe("");
    },
  },
  {
    name: "asking to stop ends the lesson without a new exercise",
    messages: activeLesson("Fractions", PIZZA_QUESTION, "let's stop here"),
    check: (reply) => {
      expect(reply.toolNames[0]).toBe("endGuidedLesson");
      expect(reply.toolNames).not.toContain("askStudyQuestion");
    },
  },
  {
    name: "a step-by-step explanation is answered, not turned into a lesson",
    messages: conversation("Explain step by step how to differentiate x^2"),
    check: (reply) => {
      expect(reply.toolNames).not.toContain("startGuidedLesson");
      expect(reply.text).toMatch(/2\s*x/);
    },
  },
  {
    name: "/learn starts a lesson on the requested topic",
    messages: conversation("/learn fractions"),
    check: (reply) => {
      expect(reply.toolNames[0]).toBe("startGuidedLesson");
      expect(JSON.stringify(reply.tools[0]?.input)).toMatch(/fraction/i);
    },
  },
]);
