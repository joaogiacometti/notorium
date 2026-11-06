import { beforeEach, describe, expect, it, vi } from "vitest";

const getNoteByIdForUser = vi.hoisted(() => vi.fn());

vi.mock("@/features/notes/queries", () => ({ getNoteByIdForUser }));
vi.mock("@/lib/auth/auth", () => ({
  requireSession: async () => ({ user: { id: "user-1" } }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
}));

async function visit(noteId: string) {
  const { default: NoteLinkPage } = await import(
    "@/app/(app)/notes/[noteId]/page"
  );
  return NoteLinkPage({ params: Promise.resolve({ noteId }) });
}

describe("note link page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects an owned note to its current folder", async () => {
    getNoteByIdForUser.mockResolvedValue({ id: "n1", folderId: "s2" });

    await expect(visit("n1")).rejects.toThrow(
      "redirect:/folders/s2/documents/notes/n1",
    );
    expect(getNoteByIdForUser).toHaveBeenCalledWith("user-1", "n1");
  });

  it("shows not-found for a note the user can't read", async () => {
    getNoteByIdForUser.mockResolvedValue(null);

    await expect(visit("foreign")).rejects.toThrow("not-found");
  });
});
