import { expect, test } from "@playwright/test";
import { submitLogin, submitSignup } from "../../helpers/auth";
import {
  e2eAuthUser,
  e2eSubjectsStorageStatePath,
  e2eSubjectsUser,
} from "../../helpers/constants";
import { approveE2EUser, closeE2EDb, resetE2EUser } from "../../helpers/db";

test.afterAll(async () => {
  await closeE2EDb();
});

test("create approved e2e accounts and persist subjects auth state", async ({
  browser,
}) => {
  await resetE2EUser(e2eSubjectsUser.email);
  await resetE2EUser(e2eAuthUser.email);

  const subjectsContext = await browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": "10.0.0.1",
    },
  });
  const subjectsPage = await subjectsContext.newPage();

  await subjectsPage.goto("/en/signup");
  await submitSignup(subjectsPage, e2eSubjectsUser);
  await Promise.race([
    expect(subjectsPage).toHaveURL(/\/en\/login$/),
    expect(subjectsPage).toHaveURL(/\/en(?:\/)?$/),
  ]);

  await approveE2EUser(e2eSubjectsUser.email);

  await subjectsPage.goto("/en/subjects");

  if (new URL(subjectsPage.url()).pathname === "/en/login") {
    await submitLogin(subjectsPage, {
      email: e2eSubjectsUser.email,
      password: e2eSubjectsUser.password,
    });
    await expect(subjectsPage).toHaveURL(/\/en(?:\/)?$/);
    await subjectsPage.goto("/en/subjects");
  }

  await expect(subjectsPage.locator("#btn-create-subject")).toBeVisible();

  const storageState = await subjectsContext.storageState();
  expect(storageState.cookies.length).toBeGreaterThan(0);
  await subjectsContext.storageState({ path: e2eSubjectsStorageStatePath });
  await subjectsContext.close();

  const authContext = await browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": "10.0.0.1",
    },
  });
  const authPage = await authContext.newPage();

  await authPage.goto("/en/signup");
  await submitSignup(authPage, e2eAuthUser);
  await Promise.race([
    expect(authPage).toHaveURL(/\/en\/login$/),
    expect(authPage).toHaveURL(/\/en(?:\/)?$/),
  ]);

  await approveE2EUser(e2eAuthUser.email);
  await authContext.close();
});
