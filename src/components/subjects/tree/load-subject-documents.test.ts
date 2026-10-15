import { describe, expect, it } from "vitest";
import {
  loadSubjectDocuments,
  shouldLoadSubjectDocuments,
} from "@/components/subjects/tree/load-subject-documents";
import type { SubjectDocumentsState } from "@/components/subjects/tree/subject-tree-types";
import type { DocumentListItem } from "@/features/documents/types";

/** Applies state updates like React would, so tests read the latest map. */
class FakeSubjectDocumentsStore {
  state: SubjectDocumentsState = new Map();
  readonly history: Array<
    DocumentListItem[] | "loading" | "error" | undefined
  > = [];

  setDocumentsBySubject = (
    update:
      | SubjectDocumentsState
      | ((current: SubjectDocumentsState) => SubjectDocumentsState),
  ): void => {
    this.state = typeof update === "function" ? update(this.state) : update;
    this.history.push(this.state.get("s1"));
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const noteRow = { id: "n1", kind: "note" } as unknown as DocumentListItem;

describe("loadSubjectDocuments", () => {
  it("shows loading, then the fetched documents", async () => {
    const store = new FakeSubjectDocumentsStore();

    await loadSubjectDocuments(
      {
        setDocumentsBySubject: store.setDocumentsBySubject,
        requestIdsRef: { current: new Map() },
        fetchDocuments: async () => [noteRow],
      },
      "s1",
    );

    expect(store.history).toEqual(["loading", [noteRow]]);
  });

  it("settles on error instead of spinning forever when the fetch fails", async () => {
    const store = new FakeSubjectDocumentsStore();

    await loadSubjectDocuments(
      {
        setDocumentsBySubject: store.setDocumentsBySubject,
        requestIdsRef: { current: new Map() },
        fetchDocuments: async () => {
          throw new Error("network down");
        },
      },
      "s1",
    );

    expect(store.state.get("s1")).toBe("error");
  });

  it("ignores an older response that resolves after a newer one", async () => {
    const store = new FakeSubjectDocumentsStore();
    const first = deferred<DocumentListItem[]>();
    const second = deferred<DocumentListItem[]>();
    const responses = [first.promise, second.promise];
    const loader = {
      setDocumentsBySubject: store.setDocumentsBySubject,
      requestIdsRef: { current: new Map<string, number>() },
      fetchDocuments: () => responses.shift() ?? Promise.resolve([]),
    };

    const older = loadSubjectDocuments(loader, "s1");
    const newer = loadSubjectDocuments(loader, "s1");
    second.resolve([noteRow]);
    await newer;
    first.reject(new Error("stale failure"));
    await older;

    expect(store.state.get("s1")).toEqual([noteRow]);
  });
});

describe("shouldLoadSubjectDocuments", () => {
  it("loads when never fetched or after a failure, not while cached or loading", () => {
    const state: SubjectDocumentsState = new Map<
      string,
      DocumentListItem[] | "loading" | "error"
    >([
      ["failed", "error"],
      ["loading", "loading"],
      ["cached", []],
    ]);

    expect(shouldLoadSubjectDocuments(state, "unknown")).toBe(true);
    expect(shouldLoadSubjectDocuments(state, "failed")).toBe(true);
    expect(shouldLoadSubjectDocuments(state, "loading")).toBe(false);
    expect(shouldLoadSubjectDocuments(state, "cached")).toBe(false);
  });
});
