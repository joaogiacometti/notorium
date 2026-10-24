import { beforeEach, describe, expect, it, vi } from "vitest";

const insertReturningMock = vi.fn();
const insertValuesMock = vi.fn(() => ({
  returning: insertReturningMock,
}));
const insertMock = vi.fn(() => ({
  values: insertValuesMock,
}));
const updateWhereMock = vi.fn();
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
type TransactionCallback = (transaction: {
  insert: typeof insertMock;
  update: typeof updateMock;
  execute: typeof executeMock;
}) => Promise<unknown>;
const executeMock = vi.fn();
const transactionMock = vi.fn((callback: TransactionCallback) =>
  callback({ insert: insertMock, update: updateMock, execute: executeMock }),
);
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const inArrayMock = vi.fn((column, values) => ({ column, values }));
const isNotNullMock = vi.fn((column) => ({ column, operator: "isNotNull" }));
const isNullMock = vi.fn((column) => ({ column, operator: "isNull" }));
const countTotalSubjectsForUserMock = vi.fn();
const countChildSubjectsForUserMock = vi.fn();
const getAllSubjectsWithPathsForUserMock = vi.fn();
const getSubjectRecordForUserMock = vi.fn();
const getSubjectTreeRecordForUserMock = vi.fn();
const getSubjectDepthForUserMock = vi.fn();
const getSubjectSubtreeHeightForUserMock = vi.fn();
const isSubjectAncestorOfMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    transaction: transactionMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  sql: vi.fn(),
  and: andMock,
  eq: eqMock,
  inArray: inArrayMock,
  isNotNull: isNotNullMock,
  isNull: isNullMock,
}));

vi.mock("@/db/schema", () => ({
  subject: {
    id: "subject_id_column",
    userId: "subject_user_id_column",
  },
}));

vi.mock("@/features/subjects/queries", () => ({
  countTotalSubjectsForUser: countTotalSubjectsForUserMock,
  countChildSubjectsForUser: countChildSubjectsForUserMock,
  getAllSubjectsWithPathsForUser: getAllSubjectsWithPathsForUserMock,
  getSubjectRecordForUser: getSubjectRecordForUserMock,
  getSubjectTreeRecordForUser: getSubjectTreeRecordForUserMock,
  getSubjectDepthForUser: getSubjectDepthForUserMock,
  getSubjectSubtreeHeightForUser: getSubjectSubtreeHeightForUserMock,
  isSubjectAncestorOf: isSubjectAncestorOfMock,
}));

describe("createSubjectForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertReturningMock.mockReset();
    getSubjectSubtreeHeightForUserMock.mockResolvedValue(1);
  });

  it("returns the subject limit error when total owned subjects reaches the max", async () => {
    const { LIMITS } = await import("@/lib/config/limits");
    countTotalSubjectsForUserMock.mockResolvedValueOnce(LIMITS.maxSubjects);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "History",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.subjectLimit",
      errorParams: { max: LIMITS.maxSubjects },
      errorMessage: undefined,
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates a root subject when the user is below the total subject limit", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    insertReturningMock.mockResolvedValueOnce([{ id: "subject-1" }]);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "  History  ",
    });

    expect(result).toEqual({ success: true, subjectId: "subject-1" });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      name: "History",
      parentSubjectId: null,
    });
  });

  it("nests a subfolder under its parent", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    countChildSubjectsForUserMock.mockResolvedValueOnce(0);
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentSubjectId: null,
      name: "Root",
    });
    getSubjectDepthForUserMock.mockResolvedValueOnce(1);
    insertReturningMock.mockResolvedValueOnce([{ id: "child-1" }]);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Chapter 1",
      parentSubjectId: "parent-1",
    });

    expect(result).toEqual({ success: true, subjectId: "child-1" });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Chapter 1",
      parentSubjectId: "parent-1",
    });
  });

  it("creates a nested path relative to an explicitly selected parent", async () => {
    getAllSubjectsWithPathsForUserMock.mockResolvedValueOnce([
      { id: "school-1", path: "School" },
      { id: "term-root", path: "Term" },
    ]);
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    countChildSubjectsForUserMock.mockResolvedValueOnce(0);
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "school-1",
      parentSubjectId: null,
      name: "School",
    });
    getSubjectDepthForUserMock.mockResolvedValueOnce(1);
    insertReturningMock
      .mockResolvedValueOnce([{ id: "term-1" }])
      .mockResolvedValueOnce([{ id: "week-1" }]);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Term::Week 1",
      parentSubjectId: "school-1",
    });

    expect(result).toEqual({ success: true, subjectId: "week-1" });
    expect(insertValuesMock).toHaveBeenNthCalledWith(1, {
      userId: "user-1",
      name: "Term",
      parentSubjectId: "school-1",
    });
    expect(insertValuesMock).toHaveBeenNthCalledWith(2, {
      userId: "user-1",
      name: "Week 1",
      parentSubjectId: "term-1",
    });
  });

  it("creates a child subject from a :: path", async () => {
    getAllSubjectsWithPathsForUserMock.mockResolvedValueOnce([
      { id: "parent-1", path: "Root" },
    ]);
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    countChildSubjectsForUserMock.mockResolvedValueOnce(0);
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentSubjectId: null,
      name: "Root",
    });
    getSubjectDepthForUserMock.mockResolvedValueOnce(1);
    insertReturningMock.mockResolvedValueOnce([{ id: "child-1" }]);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Root:: Chapter 1 ",
    });

    expect(result).toEqual({ success: true, subjectId: "child-1" });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Chapter 1",
      parentSubjectId: "parent-1",
    });
    expect(transactionMock).toHaveBeenCalledOnce();
  });

  it("creates every subject from a missing :: path", async () => {
    getAllSubjectsWithPathsForUserMock.mockResolvedValueOnce([]);
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    insertReturningMock
      .mockResolvedValueOnce([{ id: "math-1" }])
      .mockResolvedValueOnce([{ id: "calculus-1" }])
      .mockResolvedValueOnce([{ id: "integrals-1" }]);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Math::Calculus::Integrals",
    });

    expect(result).toEqual({ success: true, subjectId: "integrals-1" });
    expect(insertValuesMock).toHaveBeenNthCalledWith(1, {
      userId: "user-1",
      name: "Math",
      parentSubjectId: null,
    });
    expect(insertValuesMock).toHaveBeenNthCalledWith(2, {
      userId: "user-1",
      name: "Calculus",
      parentSubjectId: "math-1",
    });
    expect(insertValuesMock).toHaveBeenNthCalledWith(3, {
      userId: "user-1",
      name: "Integrals",
      parentSubjectId: "calculus-1",
    });
  });

  it("maps a path-segment collision from the atomic transaction", async () => {
    getAllSubjectsWithPathsForUserMock.mockResolvedValueOnce([]);
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    insertReturningMock
      .mockResolvedValueOnce([{ id: "math-1" }])
      .mockRejectedValueOnce({ code: "23505" });

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Math::Calculus",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.duplicateName",
    });
    expect(transactionMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it("creates only missing subjects from a partially existing :: path", async () => {
    getAllSubjectsWithPathsForUserMock.mockResolvedValueOnce([
      { id: "math-1", path: "Math" },
    ]);
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    countChildSubjectsForUserMock.mockResolvedValueOnce(0);
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "math-1",
      parentSubjectId: null,
      name: "Math",
    });
    getSubjectDepthForUserMock.mockResolvedValueOnce(1);
    insertReturningMock
      .mockResolvedValueOnce([{ id: "calculus-1" }])
      .mockResolvedValueOnce([{ id: "integrals-1" }]);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Math::Calculus::Integrals",
    });

    expect(result).toEqual({ success: true, subjectId: "integrals-1" });
    expect(insertValuesMock).toHaveBeenNthCalledWith(1, {
      userId: "user-1",
      name: "Calculus",
      parentSubjectId: "math-1",
    });
    expect(insertValuesMock).toHaveBeenNthCalledWith(2, {
      userId: "user-1",
      name: "Integrals",
      parentSubjectId: "calculus-1",
    });
  });

  it("returns duplicateName when the full :: path exists", async () => {
    getAllSubjectsWithPathsForUserMock.mockResolvedValueOnce([
      { id: "integrals-1", path: "Math::Calculus::Integrals" },
    ]);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Math::Calculus::Integrals",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.duplicateName",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects nesting past the depth cap", async () => {
    const { LIMITS } = await import("@/lib/config/limits");
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    countChildSubjectsForUserMock.mockResolvedValueOnce(0);
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentSubjectId: null,
      name: "Root",
    });
    getSubjectDepthForUserMock.mockResolvedValueOnce(
      LIMITS.maxSubjectNestingDepth,
    );

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Too deep",
      parentSubjectId: "parent-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.subjectNestingDepthLimit",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects nesting past the child-count cap", async () => {
    const { LIMITS } = await import("@/lib/config/limits");
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    countChildSubjectsForUserMock.mockResolvedValueOnce(
      LIMITS.maxChildSubjectsPerSubject,
    );
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce({
      id: "parent-1",
      parentSubjectId: null,
      name: "Root",
    });
    getSubjectDepthForUserMock.mockResolvedValueOnce(1);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "One too many",
      parentSubjectId: "parent-1",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "limits.childSubjectLimit",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns notFound when the parent does not exist", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    countChildSubjectsForUserMock.mockResolvedValueOnce(0);
    getSubjectTreeRecordForUserMock.mockResolvedValueOnce(null);
    getSubjectDepthForUserMock.mockResolvedValueOnce(null);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "Orphan",
      parentSubjectId: "missing",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "subjects.notFound",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns the duplicate name error on a unique constraint violation", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    insertReturningMock.mockRejectedValueOnce({ code: "23505" });

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await createSubjectForUser("user-1", {
      name: "History",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.duplicateName",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });

  it("rethrows non-unique-violation insert errors", async () => {
    countTotalSubjectsForUserMock.mockResolvedValueOnce(3);
    const unexpected = new Error("connection lost");
    insertReturningMock.mockRejectedValueOnce(unexpected);

    const { createSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    await expect(
      createSubjectForUser("user-1", { name: "History" }),
    ).rejects.toThrow(unexpected);
  });
});

describe("editSubjectForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the duplicate name error on a unique constraint violation", async () => {
    getSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    updateWhereMock.mockRejectedValueOnce({ code: "23505" });

    const { editSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await editSubjectForUser("user-1", {
      id: "subject-1",
      name: "History",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.duplicateName",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });
});

describe("deleteSubjectForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notFound when the subject is inaccessible", async () => {
    getSubjectRecordForUserMock.mockResolvedValueOnce(null);

    const { deleteSubjectForUser } = await import(
      "@/features/subjects/mutations"
    );

    const result = await deleteSubjectForUser("user-1", { id: "subject-1" });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
