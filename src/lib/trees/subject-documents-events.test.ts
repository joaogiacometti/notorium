// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import {
  notifySubjectDocumentsChanged,
  SUBJECT_DOCUMENTS_CHANGED_EVENT,
} from "@/lib/trees/subject-documents-events";

describe("notifySubjectDocumentsChanged", () => {
  it("dispatches the subject documents changed event", () => {
    const listener = vi.fn();
    window.addEventListener(SUBJECT_DOCUMENTS_CHANGED_EVENT, listener);

    notifySubjectDocumentsChanged("subject-1");

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      detail: { subjectId: "subject-1" },
    });

    window.removeEventListener(SUBJECT_DOCUMENTS_CHANGED_EVENT, listener);
  });
});
