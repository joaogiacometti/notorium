import { beforeEach, describe, expect, it, vi } from "vitest";

const insertReturningMock = vi.fn();
const insertValuesMock = vi.fn(() => ({
  returning: insertReturningMock,
}));
const insertMock = vi.fn(() => ({
  values: insertValuesMock,
}));

const updateWhereMock = vi.fn();
const updateReturningMock = vi.fn();
const updateSetMock = vi.fn(() => ({
  where: updateWhereMock,
}));
const updateMock = vi.fn(() => ({
  set: updateSetMock,
}));

const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({
  where: deleteWhereMock,
}));

const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));

const getDeckRecordForUserMock = vi.fn();
const countDecksForUserMock = vi.fn();
const countChildDecksForUserMock = vi.fn();
const getDeckDepthForUserMock = vi.fn();
const isDeckAncestorOfMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  deck: {
    id: "deck_id_column",
    userId: "deck_user_id_column",
  },
}));

vi.mock("@/features/decks/queries", () => ({
  countChildDecksForUser: countChildDecksForUserMock,
  countDecksForUser: countDecksForUserMock,
  getDeckDepthForUser: getDeckDepthForUserMock,
  getDeckRecordForUser: getDeckRecordForUserMock,
  isDeckAncestorOf: isDeckAncestorOfMock,
}));

function uniqueViolationError() {
  return Object.assign(
    new Error("duplicate key value violates unique constraint"),
    {
      code: "23505",
    },
  );
}

function wrappedUniqueViolationError() {
  return Object.assign(new Error('Failed query: insert into "deck"'), {
    cause: uniqueViolationError(),
  });
}

describe("createDeckForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countDecksForUserMock.mockResolvedValue(0);
    countChildDecksForUserMock.mockResolvedValue(0);
    updateWhereMock.mockReturnValue({
      returning: updateReturningMock,
    });
  });

  it("returns duplicateName for a duplicate root deck name", async () => {
    insertReturningMock.mockRejectedValueOnce(wrappedUniqueViolationError());

    const { createDeckForUser } = await import("@/features/decks/mutations");

    const result = await createDeckForUser("user-1", {
      name: "math",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "decks.duplicateName",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });

  it("returns duplicateName for a duplicate child deck name under the same parent", async () => {
    getDeckRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentDeckId: null,
      name: "Science",
    });
    getDeckDepthForUserMock.mockResolvedValueOnce(1);
    insertReturningMock.mockRejectedValueOnce(wrappedUniqueViolationError());

    const { createDeckForUser } = await import("@/features/decks/mutations");

    const result = await createDeckForUser("user-1", {
      parentDeckId: "parent-1",
      name: "math",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "decks.duplicateName",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });

  it("allows creating the same name under a different parent", async () => {
    getDeckRecordForUserMock.mockResolvedValueOnce({
      id: "parent-2",
      parentDeckId: null,
      name: "Humanities",
    });
    getDeckDepthForUserMock.mockResolvedValueOnce(1);
    insertReturningMock.mockResolvedValueOnce([
      {
        id: "deck-1",
        userId: "user-1",
        parentDeckId: "parent-2",
        name: "math",
      },
    ]);

    const { createDeckForUser } = await import("@/features/decks/mutations");

    const result = await createDeckForUser("user-1", {
      parentDeckId: "parent-2",
      name: "math",
    });

    expect(result).toEqual({
      success: true,
      deck: {
        id: "deck-1",
        userId: "user-1",
        parentDeckId: "parent-2",
        name: "math",
      },
    });
  });

  it("blocks creation when parent is already at max depth", async () => {
    countChildDecksForUserMock.mockResolvedValueOnce(0);
    getDeckRecordForUserMock.mockResolvedValueOnce({
      id: "parent-4",
      parentDeckId: "parent-3",
      name: "Depth 4 Deck",
    });
    getDeckDepthForUserMock.mockResolvedValueOnce(4);

    const { createDeckForUser } = await import("@/features/decks/mutations");

    const result = await createDeckForUser("user-1", {
      parentDeckId: "parent-4",
      name: "Depth 5 Deck",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.deckNestingDepthLimit",
      errorParams: { max: 4 },
      errorMessage: undefined,
    });
  });
});

describe("editDeckForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateWhereMock.mockReturnValue({
      returning: updateReturningMock,
    });
  });

  it("returns notFound when the deck does not exist", async () => {
    getDeckRecordForUserMock.mockResolvedValueOnce(null);

    const { editDeckForUser } = await import("@/features/decks/mutations");

    const result = await editDeckForUser("user-1", {
      id: "deck-1",
      name: "Renamed Deck",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "decks.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns duplicateName when renaming to an existing sibling name", async () => {
    getDeckRecordForUserMock.mockResolvedValueOnce({
      id: "deck-2",
      parentDeckId: null,
      name: "History",
    });
    updateReturningMock.mockRejectedValueOnce(wrappedUniqueViolationError());

    const { editDeckForUser } = await import("@/features/decks/mutations");

    const result = await editDeckForUser("user-1", {
      id: "deck-2",
      name: "math",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "decks.duplicateName",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });

  it("updates an existing deck", async () => {
    getDeckRecordForUserMock.mockResolvedValueOnce({
      id: "deck-2",
      parentDeckId: null,
      name: "Custom",
    });
    updateReturningMock.mockResolvedValueOnce([
      {
        id: "deck-2",
        userId: "user-1",
        name: "Custom Updated",
      },
    ]);

    const { editDeckForUser } = await import("@/features/decks/mutations");

    const result = await editDeckForUser("user-1", {
      id: "deck-2",
      name: "Custom Updated",
    });

    expect(result).toEqual({
      success: true,
      deck: {
        id: "deck-2",
        userId: "user-1",
        name: "Custom Updated",
      },
    });
    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});

describe("moveDeckForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns duplicateName when moving into a parent with the same sibling name", async () => {
    getDeckRecordForUserMock
      .mockResolvedValueOnce({
        id: "deck-to-move",
        parentDeckId: null,
        name: "math",
      })
      .mockResolvedValueOnce({
        id: "target-parent",
        parentDeckId: null,
        name: "Science",
      });
    isDeckAncestorOfMock.mockResolvedValueOnce(false);
    countChildDecksForUserMock.mockResolvedValueOnce(0);
    getDeckDepthForUserMock.mockResolvedValueOnce(1);
    updateWhereMock.mockRejectedValueOnce(wrappedUniqueViolationError());

    const { moveDeckForUser } = await import("@/features/decks/mutations");

    const result = await moveDeckForUser("user-1", {
      id: "deck-to-move",
      parentDeckId: "target-parent",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "decks.duplicateName",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });

  it("blocks move when target parent is already at max depth", async () => {
    getDeckRecordForUserMock
      .mockResolvedValueOnce({
        id: "deck-to-move",
        parentDeckId: null,
        name: "Root Deck",
      })
      .mockResolvedValueOnce({
        id: "target-parent",
        parentDeckId: "grandparent",
        name: "Depth 4 Parent",
      });
    isDeckAncestorOfMock.mockResolvedValueOnce(false);
    countChildDecksForUserMock.mockResolvedValueOnce(0);
    getDeckDepthForUserMock.mockResolvedValueOnce(4);

    const { moveDeckForUser } = await import("@/features/decks/mutations");

    const result = await moveDeckForUser("user-1", {
      id: "deck-to-move",
      parentDeckId: "target-parent",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.deckNestingDepthLimit",
      errorParams: { max: 4 },
      errorMessage: undefined,
    });
  });
});
