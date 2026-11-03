import { getAttachmentReadUrl } from "@/features/attachments/pathname";
import { searchLibraryForUser } from "@/features/search/library-queries";
import { expect, test } from "./support/isolation-test";

test("read routes isolate guessed IDs and mixed-owner batches in both directions", async ({
  isolation,
}) => {
  for (const [index, current] of isolation.accounts.entries()) {
    const foreign = isolation.accounts[1 - index].data;
    const own = current.data;
    const request = current.page.request;
    const ownNote = await request.get(`/api/notes/${own.noteId}`);
    expect(ownNote.status()).toBe(200);
    expect(await ownNote.json()).toMatchObject({
      id: own.noteId,
      userId: current.user.userId,
    });
    for (const suffix of ["", "/connections"]) {
      const denied = await request.get(`/api/notes/${foreign.noteId}${suffix}`);
      expect(denied.status()).toBe(404);
      expect(await denied.json()).toMatchObject({
        errorCode: "notes.notFound",
      });
    }
    const ownDocuments = await request.get(
      `/api/subjects/${own.subjectId}/documents`,
    );
    expect(ownDocuments.status()).toBe(200);
    expect(
      (await ownDocuments.json()).map((row: { id: string }) => row.id).sort(),
    ).toEqual([own.noteId, own.pdfId].sort());
    const foreignDocuments = await request.get(
      `/api/subjects/${foreign.subjectId}/documents`,
    );
    expect(foreignDocuments.status()).toBe(200);
    expect(await foreignDocuments.json()).toEqual([]);
    const mixed = await request.get(
      `/api/flashcards/contents?ids=${own.cardId}&ids=${foreign.cardId}`,
    );
    expect(mixed.status()).toBe(200);
    expect((await mixed.json()).map((row: { id: string }) => row.id)).toEqual([
      own.cardId,
    ]);
    const manage = await request.get(
      `/api/flashcards/manage-page?subjectIds=${foreign.subjectId}`,
    );
    expect(manage.status()).toBe(200);
    expect(await manage.json()).toMatchObject({ items: [], total: 0 });
    const options = await request.get("/api/subjects/options");
    expect(options.status()).toBe(200);
    const optionIds = (await options.json()).map(
      (row: { id: string }) => row.id,
    );
    expect(optionIds).toContain(own.subjectId);
    expect(optionIds).not.toContain(foreign.subjectId);
  }
});

test("server-rendered detail pages do not disclose another user's documents or cards", async ({
  isolation,
}) => {
  for (const [index, current] of isolation.accounts.entries()) {
    const foreign = isolation.accounts[1 - index].data;
    const own = current.data;
    await current.page.goto(
      `/subjects/${own.subjectId}/documents/notes/${own.noteId}`,
    );
    await expect(current.page.locator("#form-edit-note-title")).toHaveValue(
      `${isolation.term}-${index} note`,
    );
    await current.page.goto(
      `/subjects/${own.subjectId}/documents/pdfs/${own.pdfId}`,
    );
    await expect(
      current.page.getByRole("heading", {
        name: `${isolation.term}-${index} PDF`,
        exact: true,
      }),
    ).toBeVisible();
    await current.page.goto(`/flashcards/${own.cardId}`);
    await expect(
      current.page.locator("#form-edit-flashcard-front"),
    ).toContainText(`${isolation.term}-${index} question`);

    for (const [url, destination] of [
      [`/subjects/${foreign.subjectId}/documents/notes/${foreign.noteId}`, "/"],
      [`/subjects/${foreign.subjectId}/documents/pdfs/${foreign.pdfId}`, "/"],
      [`/flashcards/${foreign.cardId}`, "/flashcards"],
    ]) {
      // A streamed Next.js redirect can have status 200. Assert the result and
      // inspect the original response too, so hidden RSC content cannot leak.
      const response = await current.page.request.get(url, { maxRedirects: 0 });
      expect(await response.text()).not.toContain(
        `${isolation.term}-${1 - index}`,
      );
      await current.page.goto(url);
      await expect(current.page).toHaveURL(
        (location) => location.pathname === destination,
      );
      await expect(
        current.page.locator(
          "#form-edit-note-title, #form-edit-flashcard-front",
        ),
      ).toHaveCount(0);
    }
  }
});

test("global search and assistant library search return only the requesting user's matching content", async ({
  isolation,
}) => {
  for (const [index, current] of isolation.accounts.entries()) {
    const foreign = isolation.accounts[1 - index].data;
    const response = await current.page.request.get(
      `/api/search?q=${isolation.term}`,
    );
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.notes.map((row: { id: string }) => row.id)).toEqual([
      current.data.noteId,
    ]);
    expect(result.pdfs.map((row: { id: string }) => row.id)).toEqual([
      current.data.pdfId,
    ]);
    expect(result.flashcards.map((row: { id: string }) => row.id)).toEqual([
      current.data.cardId,
    ]);
    const library = await searchLibraryForUser(current.user.userId, {
      terms: [isolation.term],
    });
    expect(library.hits.map((hit) => hit.id).sort()).toEqual(
      [current.data.noteId, current.data.cardId].sort(),
    );
    expect(JSON.stringify({ result, library })).not.toContain(foreign.noteId);
    expect(JSON.stringify({ result, library })).not.toContain(foreign.cardId);
    expect(JSON.stringify({ result, library })).not.toContain(foreign.pdfId);
  }
});

test("private note images, card images and PDFs reject foreign full and range reads", async ({
  isolation,
}) => {
  for (const [index, current] of isolation.accounts.entries()) {
    const foreign = isolation.accounts[1 - index].data;
    for (const blob of current.data.media) {
      const url = getAttachmentReadUrl(blob.pathname);
      const full = await current.page.request.get(url);
      expect(full.status()).toBe(200);
      expect(await full.body()).toEqual(blob.bytes);
      const range = await current.page.request.get(url, {
        headers: { range: "bytes=0-7" },
      });
      expect(range.status()).toBe(206);
      expect(await range.body()).toEqual(blob.bytes.subarray(0, 8));
    }
    for (const blob of foreign.media) {
      for (const range of [undefined, "bytes=0-7"]) {
        const response = await current.page.request.get(
          getAttachmentReadUrl(blob.pathname),
          { headers: range ? { range } : {} },
        );
        expect(response.status()).toBe(403);
        expect(await response.body()).toHaveLength(0);
      }
    }
  }
});
