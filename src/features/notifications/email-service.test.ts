import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const getServerEnvMock = vi.fn();
const getUsersWithUpcomingAssessmentsMock = vi.fn();
const sendEmailMock = vi.fn();
const renderAssessmentReminderEmailMock = vi.fn();
const claimUnsentAssessmentsMock = vi.fn();
const markAssessmentNotificationsSentMock = vi.fn();
const markAssessmentNotificationsFailedMock = vi.fn();

vi.mock("@/env", () => ({
  getServerEnv: getServerEnvMock,
}));

vi.mock("@/features/notifications/queries", () => ({
  getUsersWithUpcomingAssessments: getUsersWithUpcomingAssessmentsMock,
}));

vi.mock("@/lib/email/provider", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/email/templates/assessment-reminder", () => ({
  renderAssessmentReminderEmail: renderAssessmentReminderEmailMock,
}));

vi.mock("@/features/notifications/mutations", () => ({
  claimUnsentAssessments: claimUnsentAssessmentsMock,
  markAssessmentNotificationsSent: markAssessmentNotificationsSentMock,
  markAssessmentNotificationsFailed: markAssessmentNotificationsFailedMock,
}));

let sendAssessmentReminderEmails: typeof import("@/features/notifications/email-service").sendAssessmentReminderEmails;

describe("sendAssessmentReminderEmails", () => {
  beforeAll(async () => {
    ({ sendAssessmentReminderEmails } = await import(
      "@/features/notifications/email-service"
    ));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getServerEnvMock.mockReturnValue({
      BETTER_AUTH_URL: "https://notorium.example.com/",
    });
    renderAssessmentReminderEmailMock.mockReturnValue({
      subject: "Upcoming assessments",
      html: "<p>Reminder</p>",
    });
  });

  it("claims assessments before sending and only sends claimed items", async () => {
    getUsersWithUpcomingAssessmentsMock.mockResolvedValueOnce([
      {
        userId: "user-1",
        email: "user@example.com",
        name: "User",
        assessments: [
          {
            id: "assessment-1",
            title: "Midterm",
            type: "exam",
            dueDate: "2026-04-15",
            subjectName: "Math",
          },
          {
            id: "assessment-2",
            title: "Essay",
            type: "assignment",
            dueDate: "2026-04-16",
            subjectName: "History",
          },
        ],
      },
    ]);
    claimUnsentAssessmentsMock.mockResolvedValueOnce(["assessment-2"]);
    sendEmailMock.mockResolvedValueOnce({ success: true, id: "email-1" });

    const result = await sendAssessmentReminderEmails();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(claimUnsentAssessmentsMock).toHaveBeenCalledWith({
      assessmentIds: ["assessment-1", "assessment-2"],
      userId: "user-1",
      notificationDate: expect.any(String),
    });
    expect(renderAssessmentReminderEmailMock).toHaveBeenCalledWith({
      userName: "User",
      assessments: [
        {
          title: "Essay",
          subjectName: "History",
          dueDate: "2026-04-16",
          type: "assignment",
        },
      ],
      appUrl: "https://notorium.example.com",
    });
    expect(markAssessmentNotificationsSentMock).toHaveBeenCalledWith({
      assessmentIds: ["assessment-2"],
      userId: "user-1",
      notificationDate: expect.any(String),
    });
    expect(markAssessmentNotificationsFailedMock).not.toHaveBeenCalled();
  });

  it("marks claimed assessments as failed when the provider send fails", async () => {
    getUsersWithUpcomingAssessmentsMock.mockResolvedValueOnce([
      {
        userId: "user-1",
        email: "user@example.com",
        name: "User",
        assessments: [
          {
            id: "assessment-1",
            title: "Midterm",
            type: "exam",
            dueDate: "2026-04-15",
            subjectName: "Math",
          },
        ],
      },
    ]);
    claimUnsentAssessmentsMock.mockResolvedValueOnce(["assessment-1"]);
    sendEmailMock.mockResolvedValueOnce({
      success: false,
      error: "provider down",
    });
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const result = await sendAssessmentReminderEmails();

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(markAssessmentNotificationsFailedMock).toHaveBeenCalledWith({
      assessmentIds: ["assessment-1"],
      userId: "user-1",
      notificationDate: expect.any(String),
    });
    expect(markAssessmentNotificationsSentMock).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("marks claimed assessments as failed when the provider throws", async () => {
    getUsersWithUpcomingAssessmentsMock.mockResolvedValueOnce([
      {
        userId: "user-1",
        email: "user@example.com",
        name: "User",
        assessments: [
          {
            id: "assessment-1",
            title: "Midterm",
            type: "exam",
            dueDate: "2026-04-15",
            subjectName: "Math",
          },
        ],
      },
    ]);
    claimUnsentAssessmentsMock.mockResolvedValueOnce(["assessment-1"]);
    sendEmailMock.mockRejectedValueOnce(new Error("network down"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const result = await sendAssessmentReminderEmails();

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(markAssessmentNotificationsFailedMock).toHaveBeenCalledWith({
      assessmentIds: ["assessment-1"],
      userId: "user-1",
      notificationDate: expect.any(String),
    });
    expect(markAssessmentNotificationsSentMock).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("marks claimed assessments as failed when marking sent throws", async () => {
    getUsersWithUpcomingAssessmentsMock.mockResolvedValueOnce([
      {
        userId: "user-1",
        email: "user@example.com",
        name: "User",
        assessments: [
          {
            id: "assessment-1",
            title: "Midterm",
            type: "exam",
            dueDate: "2026-04-15",
            subjectName: "Math",
          },
        ],
      },
    ]);
    claimUnsentAssessmentsMock.mockResolvedValueOnce(["assessment-1"]);
    sendEmailMock.mockResolvedValueOnce({ success: true, id: "email-1" });
    markAssessmentNotificationsSentMock.mockRejectedValueOnce(
      new Error("update failed"),
    );
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const result = await sendAssessmentReminderEmails();

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(markAssessmentNotificationsFailedMock).toHaveBeenCalledWith({
      assessmentIds: ["assessment-1"],
      userId: "user-1",
      notificationDate: expect.any(String),
    });

    consoleErrorSpy.mockRestore();
  });

  it("continues processing later users when one user fails", async () => {
    getUsersWithUpcomingAssessmentsMock.mockResolvedValueOnce([
      {
        userId: "user-1",
        email: "first@example.com",
        name: "First",
        assessments: [
          {
            id: "assessment-1",
            title: "Midterm",
            type: "exam",
            dueDate: "2026-04-15",
            subjectName: "Math",
          },
        ],
      },
      {
        userId: "user-2",
        email: "second@example.com",
        name: "Second",
        assessments: [
          {
            id: "assessment-2",
            title: "Essay",
            type: "assignment",
            dueDate: "2026-04-16",
            subjectName: "History",
          },
        ],
      },
    ]);
    claimUnsentAssessmentsMock
      .mockRejectedValueOnce(new Error("db unavailable"))
      .mockResolvedValueOnce(["assessment-2"]);
    sendEmailMock.mockResolvedValueOnce({ success: true, id: "email-2" });
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const result = await sendAssessmentReminderEmails();

    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith({
      to: "second@example.com",
      subject: "Upcoming assessments",
      html: "<p>Reminder</p>",
    });
    expect(markAssessmentNotificationsSentMock).toHaveBeenCalledWith({
      assessmentIds: ["assessment-2"],
      userId: "user-2",
      notificationDate: expect.any(String),
    });

    consoleErrorSpy.mockRestore();
  });
});
