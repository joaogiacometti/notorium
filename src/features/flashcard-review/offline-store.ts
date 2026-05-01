import type { SyncFlashcardReviewEventForm } from "@/features/flashcard-review/validation";
import type { FlashcardReviewState } from "@/lib/server/api-contracts";

export type FlashcardReviewSyncStatus =
  | "idle"
  | "offline"
  | "syncing"
  | "error";

export interface QueuedFlashcardReviewEvent
  extends SyncFlashcardReviewEventForm {}

interface StoredReviewState {
  scopeKey: string;
  state: SerializedFlashcardReviewState;
}

type SerializedReviewEvent = Omit<QueuedFlashcardReviewEvent, "reviewedAt"> & {
  reviewedAt: string;
};
type SerializedFlashcardReviewState = Omit<FlashcardReviewState, "cards"> & {
  cards: Array<
    Omit<FlashcardReviewState["cards"][number], "dueAt" | "lastReviewedAt"> & {
      dueAt: string;
      lastReviewedAt: string | null;
    }
  >;
};

const databaseName = "notorium-flashcard-review";
const databaseVersion = 1;
const stateStoreName = "review-state";
const queueStoreName = "review-queue";

/**
 * Builds a stable IndexedDB key for one review scope.
 *
 * @example
 * getFlashcardReviewScopeKey("deck-1")
 */
export function getFlashcardReviewScopeKey(deckId?: string): string {
  return deckId ?? "all";
}

/**
 * Serializes a review event before IndexedDB persistence.
 *
 * @example
 * serializeQueuedReviewEvent(event)
 */
export function serializeQueuedReviewEvent(
  event: QueuedFlashcardReviewEvent,
): SerializedReviewEvent {
  return {
    ...event,
    reviewedAt: event.reviewedAt.toISOString(),
  };
}

/**
 * Restores a queued review event after IndexedDB reads.
 *
 * @example
 * deserializeQueuedReviewEvent(record)
 */
export function deserializeQueuedReviewEvent(
  event: SerializedReviewEvent,
): QueuedFlashcardReviewEvent {
  return {
    ...event,
    reviewedAt: new Date(event.reviewedAt),
  };
}

/**
 * Removes duplicate review events by client id while preserving first writes.
 *
 * @example
 * dedupeQueuedReviewEvents(events)
 */
export function dedupeQueuedReviewEvents(
  events: QueuedFlashcardReviewEvent[],
): QueuedFlashcardReviewEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.clientReviewId)) {
      return false;
    }

    seen.add(event.clientReviewId);
    return true;
  });
}

/**
 * Orders queued review events by review timestamp for deterministic sync.
 *
 * @example
 * sortQueuedReviewEvents(events)
 */
export function sortQueuedReviewEvents(
  events: QueuedFlashcardReviewEvent[],
): QueuedFlashcardReviewEvent[] {
  return [...events].sort(
    (left, right) => left.reviewedAt.getTime() - right.reviewedAt.getTime(),
  );
}

/**
 * Serializes a loaded review state before IndexedDB persistence.
 *
 * @example
 * serializeFlashcardReviewState(state)
 */
export function serializeFlashcardReviewState(
  state: FlashcardReviewState,
): SerializedFlashcardReviewState {
  return {
    ...state,
    cards: state.cards.map((card) => ({
      ...card,
      dueAt: card.dueAt.toISOString(),
      lastReviewedAt: card.lastReviewedAt?.toISOString() ?? null,
    })),
  };
}

/**
 * Restores persisted review state dates after IndexedDB reads.
 *
 * @example
 * deserializeFlashcardReviewState(record)
 */
export function deserializeFlashcardReviewState(
  state: SerializedFlashcardReviewState,
): FlashcardReviewState {
  return {
    ...state,
    cards: state.cards.map((card) => ({
      ...card,
      dueAt: new Date(card.dueAt),
      lastReviewedAt: card.lastReviewedAt
        ? new Date(card.lastReviewedAt)
        : null,
    })),
  };
}

function openReviewDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = indexedDB.open(databaseName, databaseVersion);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(stateStoreName, { keyPath: "scopeKey" });
      db.createObjectStore(queueStoreName, { keyPath: "clientReviewId" });
    };
  });
}

function runStoreRequest<T>(
  mode: IDBTransactionMode,
  storeName: string,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openReviewDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = run(tx.objectStore(storeName));
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

/**
 * Saves the latest loaded review state for offline review.
 *
 * @example
 * await saveOfflineReviewState("all", state)
 */
export async function saveOfflineReviewState(
  scopeKey: string,
  state: FlashcardReviewState,
): Promise<void> {
  const value: StoredReviewState = {
    scopeKey,
    state: serializeFlashcardReviewState(state),
  };
  await runStoreRequest("readwrite", stateStoreName, (store) =>
    store.put(value),
  );
}

/**
 * Loads the last review state for a scope, clearing corrupt records.
 *
 * @example
 * const state = await loadOfflineReviewState("all")
 */
export async function loadOfflineReviewState(
  scopeKey: string,
): Promise<FlashcardReviewState | null> {
  try {
    const record = await runStoreRequest<StoredReviewState | undefined>(
      "readonly",
      stateStoreName,
      (store) => store.get(scopeKey),
    );
    return record ? deserializeFlashcardReviewState(record.state) : null;
  } catch {
    await clearOfflineReviewState(scopeKey);
    return null;
  }
}

/**
 * Clears one persisted review state after corrupt-store recovery.
 *
 * @example
 * await clearOfflineReviewState("all")
 */
export async function clearOfflineReviewState(scopeKey: string): Promise<void> {
  await runStoreRequest("readwrite", stateStoreName, (store) =>
    store.delete(scopeKey),
  );
}

/**
 * Adds or replaces one queued review event by client id.
 *
 * @example
 * await queueOfflineReviewEvent(event)
 */
export async function queueOfflineReviewEvent(
  event: QueuedFlashcardReviewEvent,
): Promise<void> {
  await runStoreRequest("readwrite", queueStoreName, (store) =>
    store.put(serializeQueuedReviewEvent(event)),
  );
}

/**
 * Loads queued review events in chronological order.
 *
 * @example
 * const events = await loadQueuedReviewEvents()
 */
export async function loadQueuedReviewEvents(): Promise<
  QueuedFlashcardReviewEvent[]
> {
  const records = await runStoreRequest<SerializedReviewEvent[]>(
    "readonly",
    queueStoreName,
    (store) => store.getAll(),
  );
  return sortQueuedReviewEvents(
    dedupeQueuedReviewEvents(records.map(deserializeQueuedReviewEvent)),
  );
}

/**
 * Removes successfully synced review events from the queue.
 *
 * @example
 * await removeQueuedReviewEvents(["client-1"])
 */
export async function removeQueuedReviewEvents(
  clientReviewIds: string[],
): Promise<void> {
  for (const clientReviewId of clientReviewIds) {
    await runStoreRequest("readwrite", queueStoreName, (store) =>
      store.delete(clientReviewId),
    );
  }
}
