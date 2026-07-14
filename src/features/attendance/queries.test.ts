import { beforeEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();
const whereMock = vi.fn(() => ({ limit: limitMock }));
const innerJoinMock = vi.fn(() => ({ where: whereMock }));
const fromMock = vi.fn(() => ({ innerJoin: innerJoinMock }));
const selectMock = vi.fn(() => ({ from: fromMock }));
const eqMock = vi.fn((column, value) => ({ column, value }));

vi.mock("@/db/index", () => ({
  getDb: () => ({ select: selectMock }),
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions) => conditions),
  asc: vi.fn(),
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  attendanceMiss: {
    id: "attendance_id_column",
    missDate: "attendance_date_column",
    subjectId: "attendance_subject_id_column",
    userId: "attendance_user_id_column",
  },
  subject: {
    id: "subject_id_column",
    kind: "subject_kind_column",
    userId: "subject_user_id_column",
  },
}));

describe("hasMissOnDateForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds records only while their owned subject is academic", async () => {
    limitMock.mockResolvedValueOnce([{ id: "miss-1" }]);
    const { hasMissOnDateForUser } = await import("./queries");

    await expect(
      hasMissOnDateForUser("user-1", "subject-1", "2026-07-14"),
    ).resolves.toBe(true);
    expect(eqMock).toHaveBeenCalledWith("subject_user_id_column", "user-1");
    expect(eqMock).toHaveBeenCalledWith("subject_kind_column", "academic");
  });
});
