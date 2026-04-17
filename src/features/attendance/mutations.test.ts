import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({
  where: deleteWhereMock,
}));

const updateWhereMock = vi.fn();
const updateSetMock = vi.fn(() => ({
  where: updateWhereMock,
}));
const updateMock = vi.fn(() => ({
  set: updateSetMock,
}));

const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));

const getActiveSubjectRecordForUserMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    delete: deleteMock,
    update: updateMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  attendanceMiss: {
    id: "attendance_miss_id_column",
    userId: "attendance_miss_user_id_column",
    subjectId: "attendance_miss_subject_id_column",
  },
  subject: {
    id: "subject_id_column",
    userId: "subject_user_id_column",
    totalClasses: "subject_total_classes_column",
    maxMisses: "subject_max_misses_column",
  },
}));

vi.mock("@/features/subjects/queries", () => ({
  getActiveSubjectRecordForUser: getActiveSubjectRecordForUserMock,
}));

describe("removeAttendanceSettingsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notFound when the subject does not exist", async () => {
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce(null);

    const { removeAttendanceSettingsForUser } = await import(
      "@/features/attendance/mutations"
    );

    const result = await removeAttendanceSettingsForUser("user-1", "subject-1");

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(deleteMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("deletes all attendance misses and clears settings for the subject", async () => {
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      userId: "user-1",
      name: "Math",
    });
    deleteWhereMock.mockResolvedValueOnce([]);
    updateWhereMock.mockResolvedValueOnce([]);

    const { removeAttendanceSettingsForUser } = await import(
      "@/features/attendance/mutations"
    );

    const result = await removeAttendanceSettingsForUser("user-1", "subject-1");

    expect(result).toEqual({
      success: true,
      subjectId: "subject-1",
    });
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("uses correct conditions for deleting attendance misses", async () => {
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      userId: "user-1",
      name: "Math",
    });
    deleteWhereMock.mockResolvedValueOnce([]);
    updateWhereMock.mockResolvedValueOnce([]);

    const { removeAttendanceSettingsForUser } = await import(
      "@/features/attendance/mutations"
    );

    await removeAttendanceSettingsForUser("user-1", "subject-1");

    expect(andMock).toHaveBeenCalledWith(
      { column: "attendance_miss_subject_id_column", value: "subject-1" },
      { column: "attendance_miss_user_id_column", value: "user-1" },
    );
  });

  it("sets totalClasses and maxMisses to null on the subject", async () => {
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      userId: "user-1",
      name: "Math",
    });
    deleteWhereMock.mockResolvedValueOnce([]);
    updateWhereMock.mockResolvedValueOnce([]);

    const { removeAttendanceSettingsForUser } = await import(
      "@/features/attendance/mutations"
    );

    await removeAttendanceSettingsForUser("user-1", "subject-1");

    expect(updateSetMock).toHaveBeenCalledWith({
      totalClasses: null,
      maxMisses: null,
    });
  });
});
