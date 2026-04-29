import { readFile, rm } from "node:fs/promises";
import path from "node:path";

export interface FixtureEmail {
  id: string;
  sentAt: string;
  to: string;
  subject: string;
  html: string;
}

const fixtureInboxPath = path.resolve(
  process.env.NOTORIUM_EMAIL_FIXTURE_INBOX_PATH ??
    "test-results/email-fixture-inbox.jsonl",
);

export async function clearFixtureEmails() {
  await rm(fixtureInboxPath, { force: true });
}

export async function readFixtureEmails() {
  let content: string;

  try {
    content = await readFile(fixtureInboxPath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as FixtureEmail);
}

export async function readFixtureEmailsForRecipient(recipient: string) {
  const emails = await readFixtureEmails();
  return emails.filter((email) => email.to === recipient);
}

export function extractResetUrl(email: FixtureEmail) {
  const hrefMatch = /href="([^"]*reset-password[^"]*)"/.exec(email.html);
  if (!hrefMatch) {
    throw new Error(
      `Fixture email ${email.id} did not include a reset-password href.`,
    );
  }

  return hrefMatch[1].replaceAll("&amp;", "&");
}
