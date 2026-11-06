import {
  bulkDeleteFlashcardsForUser,
  bulkMoveFlashcardsForUser,
  bulkResetFlashcardsForUser,
  createFlashcardForUser,
  deleteFlashcardForUser,
  editFlashcardForUser,
  resetFlashcardForUser,
} from "@/features/flashcards/mutations";
import {
  createFolderForUser,
  deleteFolderForUser,
  editFolderForUser,
  moveFolderForUser,
} from "@/features/folders/mutations";
import {
  createNoteForUser,
  deleteNoteForUser,
  editNoteForUser,
  moveNoteForUser,
} from "@/features/notes/mutations";
import {
  deletePdfForUser,
  movePdfForUser,
  renamePdfForUser,
  savePdfReadingPageForUser,
} from "@/features/pdfs/mutations";
import { testDocument } from "@/test/document";
import { snapshotIsolationData } from "./support/isolation-data";
import { expect, test } from "./support/isolation-test";

test("note mutations reject foreign records and destinations without changing either user's rows", async ({
  isolation,
}) => {
  for (const [index, current] of isolation.accounts.entries()) {
    const foreign = isolation.accounts[1 - index].data;
    const userId = current.user.userId;
    const before = await Promise.all(
      isolation.accounts.map((account) =>
        snapshotIsolationData(account.user.userId),
      ),
    );
    for (const result of [
      await editNoteForUser(userId, {
        id: foreign.noteId,
        title: "stolen",
        content: testDocument("overwritten"),
      }),
      await deleteNoteForUser(userId, { id: foreign.noteId }),
      await moveNoteForUser(userId, {
        id: foreign.noteId,
        folderId: current.data.folderId,
      }),
    ])
      expect(result).toMatchObject({
        success: false,
        errorCode: "notes.notFound",
      });
    for (const result of [
      await createNoteForUser(userId, {
        folderId: foreign.folderId,
        title: "injected",
      }),
      await moveNoteForUser(userId, {
        id: current.data.noteId,
        folderId: foreign.folderId,
      }),
    ])
      expect(result).toMatchObject({
        success: false,
        errorCode: "folders.notFound",
      });
    expect(
      await Promise.all(
        isolation.accounts.map((account) =>
          snapshotIsolationData(account.user.userId),
        ),
      ),
    ).toEqual(before);
  }
  const owner = isolation.accounts[0];
  expect(
    await editNoteForUser(owner.user.userId, {
      id: owner.data.noteId,
      title: "Owner renamed",
    }),
  ).toMatchObject({ success: true });
  expect(
    (await snapshotIsolationData(owner.user.userId)).notes.find(
      (row) => row.id === owner.data.noteId,
    )?.title,
  ).toBe("Owner renamed");
  expect(
    await createNoteForUser(owner.user.userId, {
      folderId: owner.data.destinationId,
      title: "Owner created",
    }),
  ).toMatchObject({ success: true });
  expect(
    await moveNoteForUser(owner.user.userId, {
      id: owner.data.noteId,
      folderId: owner.data.destinationId,
    }),
  ).toMatchObject({ success: true });
  expect(
    await deleteNoteForUser(owner.user.userId, { id: owner.data.noteId }),
  ).toMatchObject({ success: true });
  expect(
    (await snapshotIsolationData(owner.user.userId)).notes.some(
      (row) => row.id === owner.data.noteId,
    ),
  ).toBe(false);
});

test("folder mutations cannot rename, delete, nest in or move another user's subtree", async ({
  isolation,
}) => {
  for (const [index, current] of isolation.accounts.entries()) {
    const foreign = isolation.accounts[1 - index].data;
    const userId = current.user.userId;
    const before = await Promise.all(
      isolation.accounts.map((account) =>
        snapshotIsolationData(account.user.userId),
      ),
    );
    for (const result of [
      await editFolderForUser(userId, {
        id: foreign.folderId,
        name: "stolen",
      }),
      await deleteFolderForUser(userId, { id: foreign.folderId }),
      await moveFolderForUser(userId, {
        id: foreign.folderId,
        parentFolderId: current.data.folderId,
      }),
      await moveFolderForUser(userId, {
        id: current.data.folderId,
        parentFolderId: foreign.folderId,
      }),
      await createFolderForUser(userId, {
        name: "injected",
        parentFolderId: foreign.folderId,
      }),
      await createFolderForUser(userId, {
        name: "injected::child",
        parentFolderId: foreign.folderId,
      }),
    ])
      expect(result).toMatchObject({
        success: false,
        errorCode: "folders.notFound",
      });
    expect(
      await Promise.all(
        isolation.accounts.map((account) =>
          snapshotIsolationData(account.user.userId),
        ),
      ),
    ).toEqual(before);
  }
  const owner = isolation.accounts[0];
  expect(
    await moveFolderForUser(owner.user.userId, {
      id: owner.data.destinationId,
      parentFolderId: owner.data.folderId,
    }),
  ).toMatchObject({ success: true });
  expect(
    (await snapshotIsolationData(owner.user.userId)).folders.find(
      (row) => row.id === owner.data.destinationId,
    )?.parentFolderId,
  ).toBe(owner.data.folderId);
  expect(
    await deleteFolderForUser(owner.user.userId, { id: owner.data.folderId }),
  ).toMatchObject({ success: true });
  const after = await snapshotIsolationData(owner.user.userId);
  expect(after.notes.some((row) => row.id === owner.data.noteId)).toBe(false);
  expect(after.cards.some((row) => row.id === owner.data.cardId)).toBe(false);
  expect(after.pdfs.some((row) => row.id === owner.data.pdfId)).toBe(false);
});

test("PDF mutations protect foreign titles, reading progress, records and move targets", async ({
  isolation,
}) => {
  for (const [index, current] of isolation.accounts.entries()) {
    const foreign = isolation.accounts[1 - index].data;
    const userId = current.user.userId;
    const before = await Promise.all(
      isolation.accounts.map((account) =>
        snapshotIsolationData(account.user.userId),
      ),
    );
    for (const result of [
      await renamePdfForUser(userId, { id: foreign.pdfId, title: "stolen" }),
      await deletePdfForUser(userId, { id: foreign.pdfId }),
      await savePdfReadingPageForUser(userId, {
        id: foreign.pdfId,
        page: 2,
        pageCount: 2,
      }),
      await movePdfForUser(userId, {
        id: foreign.pdfId,
        folderId: current.data.folderId,
      }),
    ])
      expect(result).toMatchObject({
        success: false,
        errorCode: "pdfs.notFound",
      });
    expect(
      await movePdfForUser(userId, {
        id: current.data.pdfId,
        folderId: foreign.folderId,
      }),
    ).toMatchObject({ success: false, errorCode: "folders.notFound" });
    expect(
      await Promise.all(
        isolation.accounts.map((account) =>
          snapshotIsolationData(account.user.userId),
        ),
      ),
    ).toEqual(before);
  }
  const owner = isolation.accounts[0];
  expect(
    await renamePdfForUser(owner.user.userId, {
      id: owner.data.pdfId,
      title: "Owner renamed",
    }),
  ).toMatchObject({ success: true });
  expect(
    await savePdfReadingPageForUser(owner.user.userId, {
      id: owner.data.pdfId,
      page: 2,
      pageCount: 2,
    }),
  ).toMatchObject({ success: true });
  expect(
    await movePdfForUser(owner.user.userId, {
      id: owner.data.pdfId,
      folderId: owner.data.destinationId,
    }),
  ).toMatchObject({ success: true });
  expect(
    (await snapshotIsolationData(owner.user.userId)).pdfs.find(
      (row) => row.id === owner.data.pdfId,
    ),
  ).toMatchObject({
    title: "Owner renamed",
    lastPage: 2,
    folderId: owner.data.destinationId,
  });
  expect(
    await deletePdfForUser(owner.user.userId, { id: owner.data.pdfId }),
  ).toMatchObject({ success: true });
  expect(
    (await snapshotIsolationData(owner.user.userId)).pdfs.some(
      (row) => row.id === owner.data.pdfId,
    ),
  ).toBe(false);
});

test("flashcard mutations reject foreign IDs, mixed-owner batches, destinations and sources atomically", async ({
  isolation,
}) => {
  for (const [index, current] of isolation.accounts.entries()) {
    const foreign = isolation.accounts[1 - index].data;
    const own = current.data;
    const userId = current.user.userId;
    const before = await Promise.all(
      isolation.accounts.map((account) =>
        snapshotIsolationData(account.user.userId),
      ),
    );
    for (const result of [
      await editFlashcardForUser(userId, {
        id: foreign.cardId,
        folderId: own.folderId,
        front: testDocument("stolen"),
        back: testDocument("overwritten"),
      }),
      await deleteFlashcardForUser(userId, { id: foreign.cardId }),
      await resetFlashcardForUser(userId, { id: foreign.cardId }),
      await bulkDeleteFlashcardsForUser(userId, {
        ids: [own.cardId, foreign.cardId],
      }),
      await bulkResetFlashcardsForUser(userId, {
        ids: [own.cardId, foreign.cardId],
      }),
      await bulkMoveFlashcardsForUser(userId, {
        ids: [own.cardId, foreign.cardId],
        folderId: own.destinationId,
      }),
    ])
      expect(result).toMatchObject({
        success: false,
        errorCode: "flashcards.notFound",
      });
    for (const result of [
      await createFlashcardForUser(userId, {
        folderId: foreign.folderId,
        front: testDocument("injected"),
        back: testDocument("answer"),
      }),
      await editFlashcardForUser(userId, {
        id: own.cardId,
        folderId: foreign.folderId,
        front: testDocument("injected"),
        back: testDocument("answer"),
      }),
      await bulkMoveFlashcardsForUser(userId, {
        ids: [own.cardId],
        folderId: foreign.folderId,
      }),
    ])
      expect(result).toMatchObject({
        success: false,
        errorCode: "folders.notFound",
      });
    expect(
      await createFlashcardForUser(userId, {
        folderId: own.folderId,
        front: testDocument("injected"),
        back: testDocument("answer"),
        source: { kind: "note", id: foreign.noteId },
      }),
    ).toMatchObject({ success: false, errorCode: "notes.notFound" });
    expect(
      await Promise.all(
        isolation.accounts.map((account) =>
          snapshotIsolationData(account.user.userId),
        ),
      ),
    ).toEqual(before);
  }
  const owner = isolation.accounts[0];
  expect(
    await editFlashcardForUser(owner.user.userId, {
      id: owner.data.cardId,
      folderId: owner.data.folderId,
      front: testDocument("Owner renamed"),
      back: testDocument("Owner answer"),
    }),
  ).toMatchObject({ success: true });
  expect(
    (await snapshotIsolationData(owner.user.userId)).cards.find(
      (row) => row.id === owner.data.cardId,
    )?.front,
  ).toEqual(testDocument("Owner renamed"));
  expect(
    await resetFlashcardForUser(owner.user.userId, { id: owner.data.cardId }),
  ).toMatchObject({ success: true });
  expect(
    await bulkMoveFlashcardsForUser(owner.user.userId, {
      ids: [owner.data.cardId],
      folderId: owner.data.destinationId,
    }),
  ).toMatchObject({ success: true });
  expect(
    await bulkResetFlashcardsForUser(owner.user.userId, {
      ids: [owner.data.cardId],
    }),
  ).toMatchObject({ success: true });
  expect(
    await bulkDeleteFlashcardsForUser(owner.user.userId, {
      ids: [owner.data.cardId],
    }),
  ).toMatchObject({ success: true });
  expect(
    (await snapshotIsolationData(owner.user.userId)).cards.some(
      (row) => row.id === owner.data.cardId,
    ),
  ).toBe(false);
});

test("a forged note-edit Server Action cannot substitute another user's note or identity", async ({
  isolation,
}) => {
  for (const [index, current] of isolation.accounts.entries()) {
    const other = isolation.accounts[1 - index];
    const before = await Promise.all(
      isolation.accounts.map((account) =>
        snapshotIsolationData(account.user.userId),
      ),
    );
    await current.page.goto(
      `/folders/${current.data.folderId}/documents/notes/${current.data.noteId}`,
    );
    const editor = current.page.locator("#form-edit-note-title");
    await expect(editor).toBeVisible();
    const actionResponse = Promise.withResolvers<{
      status: number;
      body: string;
    }>();
    await current.page.route("**/*", async (route) => {
      const request = route.request();
      const body = request.postData();
      if (
        !request.headers()["next-action"] ||
        !body?.includes(current.data.noteId)
      ) {
        await route.continue();
        return;
      }
      const args = JSON.parse(body);
      args[0].id = other.data.noteId;
      args[0].userId = other.user.userId;
      // Forward to the real Action and pass its response through unchanged.
      // Read it here because Chromium can discard streamed Action bodies.
      const upstream = await route.fetch({
        postData: JSON.stringify(args),
        maxRedirects: 0,
      });
      const responseBody = await upstream.text();
      await route.fulfill({ response: upstream });
      actionResponse.resolve({ status: upstream.status(), body: responseBody });
    });
    await editor.fill("Attempted cross-user overwrite");
    const response = await actionResponse.promise;
    expect(response.status).toBe(200);
    expect(response.body).toContain('"errorCode":"notes.notFound"');
    await expect(
      current.page.getByText("Note not found.", { exact: true }),
    ).toBeVisible();
    await current.page.unrouteAll({ behavior: "wait" });
    expect(
      await Promise.all(
        isolation.accounts.map((account) =>
          snapshotIsolationData(account.user.userId),
        ),
      ),
    ).toEqual(before);
    await editor.fill("Owner authorized rename");
    await expect
      .poll(
        async () =>
          (await snapshotIsolationData(current.user.userId)).notes.find(
            (row) => row.id === current.data.noteId,
          )?.title,
      )
      .toBe("Owner authorized rename");
  }
});
