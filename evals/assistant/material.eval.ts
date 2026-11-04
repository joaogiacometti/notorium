import { expect } from "vitest";
import { conversation } from "./fixtures";
import { runAssistantEvals } from "./harness";

runAssistantEvals("material", [
  {
    name: "a PDF page without text is reported as unreadable",
    messages: conversation("What does this page say?"),
    request: {
      context: {
        kind: "pdf",
        title: "Biochemistry",
        page: 12,
        scope: "page",
        partial: false,
        content: "",
      },
    },
    check: (reply) => {
      expect(reply.text).toMatch(
        /can.?t|cannot|unable|not able|no (selectable )?text|empty/i,
      );
      expect(reply.text).not.toMatch(/enzyme|protein|metabol/i);
    },
  },
]);
