import { expect } from "vitest";
import { conversation } from "./fixtures";
import { runAssistantEvals } from "./harness";

runAssistantEvals("formatting", [
  {
    name: "math uses dollar delimiters",
    messages: conversation("What is the quadratic formula?"),
    check: (reply) => {
      expect(reply.text).toMatch(/\$[^$]+\$/);
      expect(reply.text).not.toMatch(/\\[([]/);
    },
  },
]);
