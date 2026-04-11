import { beforeEach, describe, expect, it, vi } from "vitest";

const returningMock = vi.fn();
const whereMock = vi.fn(() => ({
  returning: returningMock,
}));
const setMock = vi.fn(() => ({
  where: whereMock,
}));
const updateMock = vi.fn(() => ({
  set: setMock,
}));
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const getDeckRecordForUserMock = vi.fn();
const countDecksBySubjectForUserMock = vi.fn();
const getDefaultDeckForSubjectMock = vi.fn();
const getActiveSubjectRecordForUserMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    update: updateMock,
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
  flashcard: {
    deckId: "flashcard_deck_id_column",
  },
}));

vi.mock("@/features/decks/queries", () => ({
  countDecksBySubjectForUser: countDecksBySubjectForUserMock,
  getDeckRecordForUser: getDeckRecordForUserMock,
  getDefaultDeckForSubject: getDefaultDeckForSubjectMock,
}));

vi.mock("@/features/subjects/queries", () => ({
  getActiveSubjectRecordForUser: getActiveSubjectRecordForUserMock,
}));

describe("editDeckForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an error when attempting to edit the default deck", async () => {
    getDeckRecordForUserMock.mockResolvedValueOnce({
      id: "deck-1",
      subjectId: "subject-1",
      isDefault: true,
      name: "General",
    });

    const { editDeckForUser } = await import("@/features/decks/mutations");

    const result = await editDeckForUser("user-1", {
      id: "deck-1",
      name: "Renamed General",
      description: "Updated",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "decks.cannotEditDefault",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates non-default decks", async () => {
    getDeckRecordForUserMock.mockResolvedValueOnce({
      id: "deck-2",
      subjectId: "subject-1",
      isDefault: false,
      name: "Custom",
    });
    returningMock.mockResolvedValueOnce([
      {
        id: "deck-2",
        subjectId: "subject-1",
        userId: "user-1",
        name: "Custom Updated",
        description: "Updated description",
        isDefault: false,
      },
    ]);

    const { editDeckForUser } = await import("@/features/decks/mutations");

    const result = await editDeckForUser("user-1", {
      id: "deck-2",
      name: "Custom Updated",
      description: "Updated description",
    });

    expect(result).toEqual({
      success: true,
      deck: {
        id: "deck-2",
        subjectId: "subject-1",
        userId: "user-1",
        name: "Custom Updated",
        description: "Updated description",
        isDefault: false,
      },
    });
    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});
