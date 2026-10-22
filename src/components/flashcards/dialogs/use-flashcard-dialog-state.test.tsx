import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import type { FlashcardFormValues } from "@/features/flashcards/validation";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

const chatEdits = vi.hoisted(() => ({ pending: false }));
vi.mock("@/components/assistant/assistant-workspace-context", () => ({
  useAssistantWorkspace: () => ({ pending: chatEdits.pending ? {} : null }),
}));
const addEventListenerSpy = vi.spyOn(window, "addEventListener");
const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

interface HarnessProps {
  mode?: "create" | "edit";
  open: boolean;
  values: FlashcardFormValues;
  onOpenChange?: (open: boolean) => void;
  onSubmitAction?: (
    values: FlashcardFormValues,
  ) => Promise<{ success: true } | ActionErrorResult>;
  getSuccessValues?: (
    values: FlashcardFormValues,
    options: { keepFrontAfterSubmit: boolean; keepBackAfterSubmit: boolean },
  ) => FlashcardFormValues;
}

function TestHarness({
  mode = "create",
  open,
  values,
  onOpenChange = () => {},
  onSubmitAction = async () => ({ success: true }),
  getSuccessValues = (currentValues) => currentValues,
}: Readonly<HarnessProps>) {
  const form = useForm<FlashcardFormValues>({
    defaultValues: values,
  });
  const dialog = useFlashcardDialogState({
    mode,
    open,
    onOpenChange,
    values,
    form,
    onSubmitAction,
    getSuccessValues: (currentValues, options) =>
      getSuccessValues(currentValues, options),
    closeOnSuccess: false,
  });
  const currentValues = form.watch();

  return (
    <div>
      <output data-testid="front">{currentValues.front}</output>
      <output data-testid="back">{currentValues.back}</output>
      <output data-testid="subjectId">{currentValues.subjectId}</output>
      <output data-testid="duplicate">
        {dialog.isDuplicateFront ? "true" : "false"}
      </output>
      <output data-testid="saved">{dialog.isSaved ? "true" : "false"}</output>
      <output data-testid="discard">
        {dialog.discardDialogOpen ? "true" : "false"}
      </output>
      <button
        type="button"
        data-testid="edit-front"
        onClick={() =>
          form.setValue("front", "<p>Revised front</p>", { shouldDirty: true })
        }
      />
      <button
        type="button"
        data-testid="submit"
        onClick={() => dialog.handleSubmit(form.getValues())}
      />
      <button
        type="button"
        data-testid="close"
        onClick={() => void dialog.handleOpenChange(false)}
      />
      <button
        type="button"
        data-testid="keep-front-on"
        onClick={() => dialog.setKeepFrontAfterSubmit(true)}
      />
      <button
        type="button"
        data-testid="keep-back-on"
        onClick={() => dialog.setKeepBackAfterSubmit(true)}
      />
    </div>
  );
}

function getByTestId(container: HTMLElement, testId: string) {
  const element = container.querySelector(`[data-testid="${testId}"]`);

  if (!(element instanceof HTMLElement)) {
    throw new TypeError(`Element not found: ${testId}`);
  }

  return element;
}

describe("useFlashcardDialogState", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    chatEdits.pending = false;
    addEventListenerSpy.mockClear();
    removeEventListenerSpy.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.useRealTimers();
  });

  it("syncs incoming values while the dialog stays open", async () => {
    await act(async () => {
      root.render(
        <TestHarness
          open
          values={{
            subjectId: "deck-1",
            front: "<p>Front A</p>",
            back: "<p>Back A</p>",
          }}
        />,
      );
    });

    await act(async () => {
      root.render(
        <TestHarness
          open
          values={{
            subjectId: "deck-2",
            front: "<p>Front B</p>",
            back: "<p>Back B</p>",
          }}
        />,
      );
    });

    expect(getByTestId(container, "subjectId").textContent).toBe("deck-2");
    expect(getByTestId(container, "front").textContent).toBe("<p>Front B</p>");
    expect(getByTestId(container, "back").textContent).toBe("<p>Back B</p>");
  });

  it.each(["create", "edit"] as const)(
    "submits %s immediately after editing the front",
    async (mode) => {
      const onSubmitAction = vi.fn().mockResolvedValue({ success: true });
      await act(async () =>
        root.render(
          <TestHarness
            mode={mode}
            open
            values={{
              subjectId: "deck-1",
              front: "<p>Front</p>",
              back: "<p>Back</p>",
            }}
            onSubmitAction={onSubmitAction}
          />,
        ),
      );
      await act(async () => getByTestId(container, "edit-front").click());
      await act(async () => getByTestId(container, "submit").click());
      expect(onSubmitAction).toHaveBeenCalledWith({
        subjectId: "deck-1",
        front: "<p>Revised front</p>",
        back: "<p>Back</p>",
      });
    },
  );

  it.each(["create", "edit"] as const)(
    "preserves a rejected %s draft and clears the error before retrying an edited front",
    async (mode) => {
      const onSubmitAction = vi
        .fn()
        .mockResolvedValueOnce({
          success: false,
          errorCode: "flashcards.duplicateFront",
        })
        .mockResolvedValueOnce({ success: true });
      await act(async () =>
        root.render(
          <TestHarness
            mode={mode}
            open
            values={{
              subjectId: "deck-1",
              front: "<p>Front</p>",
              back: "<p>Back</p>",
            }}
            onSubmitAction={onSubmitAction}
          />,
        ),
      );
      await act(async () => getByTestId(container, "submit").click());
      expect(getByTestId(container, "duplicate").textContent).toBe("true");
      expect(getByTestId(container, "front").textContent).toBe("<p>Front</p>");
      expect(getByTestId(container, "back").textContent).toBe("<p>Back</p>");
      expect(getByTestId(container, "subjectId").textContent).toBe("deck-1");
      await act(async () => getByTestId(container, "edit-front").click());
      expect(getByTestId(container, "duplicate").textContent).toBe("false");
      await act(async () => getByTestId(container, "submit").click());
      expect(onSubmitAction).toHaveBeenCalledTimes(2);
      expect(getByTestId(container, "duplicate").textContent).toBe("false");
    },
  );

  it("lets a kept front submit again and reports the save-time conflict", async () => {
    const onSubmitAction = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({
        success: false,
        errorCode: "flashcards.duplicateFront",
      });
    await act(async () =>
      root.render(
        <TestHarness
          open
          values={{
            subjectId: "deck-1",
            front: "<p>Front</p>",
            back: "<p>Back</p>",
          }}
          onSubmitAction={onSubmitAction}
        />,
      ),
    );
    await act(async () => getByTestId(container, "submit").click());
    expect(getByTestId(container, "duplicate").textContent).toBe("false");
    expect(getByTestId(container, "saved").textContent).toBe("true");
    await act(async () => getByTestId(container, "submit").click());
    expect(onSubmitAction).toHaveBeenCalledTimes(2);
    expect(getByTestId(container, "duplicate").textContent).toBe("true");
    expect(getByTestId(container, "saved").textContent).toBe("false");
  });

  it("clears front and back after submit when both pins are off", async () => {
    await act(async () => {
      root.render(
        <TestHarness
          open
          values={{
            subjectId: "deck-1",
            front: "<p>Front A</p>",
            back: "<p>Back A</p>",
          }}
          getSuccessValues={(currentValues, options) => ({
            subjectId: currentValues.subjectId,
            front: options.keepFrontAfterSubmit ? currentValues.front : "",
            back: options.keepBackAfterSubmit ? currentValues.back : "",
          })}
        />,
      );
    });

    await act(async () => {
      getByTestId(container, "submit").click();
    });

    expect(getByTestId(container, "front").textContent).toBe("");
    expect(getByTestId(container, "back").textContent).toBe("");
  });

  it("keeps only front after submit when front pin is on", async () => {
    await act(async () => {
      root.render(
        <TestHarness
          open
          values={{
            subjectId: "deck-1",
            front: "<p>Front A</p>",
            back: "<p>Back A</p>",
          }}
          getSuccessValues={(currentValues, options) => ({
            subjectId: currentValues.subjectId,
            front: options.keepFrontAfterSubmit ? currentValues.front : "",
            back: options.keepBackAfterSubmit ? currentValues.back : "",
          })}
        />,
      );
    });

    await act(async () => {
      getByTestId(container, "keep-front-on").click();
    });

    await act(async () => {
      getByTestId(container, "submit").click();
    });

    expect(getByTestId(container, "front").textContent).toBe("<p>Front A</p>");
    expect(getByTestId(container, "back").textContent).toBe("");
  });

  it("keeps only back after submit when back pin is on", async () => {
    await act(async () => {
      root.render(
        <TestHarness
          open
          values={{
            subjectId: "deck-1",
            front: "<p>Front A</p>",
            back: "<p>Back A</p>",
          }}
          getSuccessValues={(currentValues, options) => ({
            subjectId: currentValues.subjectId,
            front: options.keepFrontAfterSubmit ? currentValues.front : "",
            back: options.keepBackAfterSubmit ? currentValues.back : "",
          })}
        />,
      );
    });

    await act(async () => {
      getByTestId(container, "keep-back-on").click();
    });

    await act(async () => {
      getByTestId(container, "submit").click();
    });

    expect(getByTestId(container, "front").textContent).toBe("");
    expect(getByTestId(container, "back").textContent).toBe("<p>Back A</p>");
  });

  it("blocks saving and registers beforeunload while chat edits await review", async () => {
    chatEdits.pending = true;
    const onSubmitAction = vi.fn();
    await act(async () =>
      root.render(
        <TestHarness
          open
          mode="edit"
          onSubmitAction={onSubmitAction}
          values={{
            subjectId: "deck-1",
            front: "<p>Front</p>",
            back: "<p>Back</p>",
          }}
        />,
      ),
    );
    await act(async () => getByTestId(container, "submit").click());
    expect(onSubmitAction).not.toHaveBeenCalled();
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("does not show discard confirmation after successful edit save", async () => {
    const onOpenChange = vi.fn();
    const onSubmitAction = vi.fn().mockResolvedValue({ success: true });

    await act(async () => {
      root.render(
        <TestHarness
          mode="edit"
          open
          onOpenChange={onOpenChange}
          values={{
            subjectId: "deck-1",
            front: "<p>Front A</p>",
            back: "<p>Back A</p>",
          }}
          onSubmitAction={onSubmitAction}
          getSuccessValues={(currentValues) => currentValues}
        />,
      );
    });

    await act(async () => {
      getByTestId(container, "submit").click();
    });

    await act(async () => {
      getByTestId(container, "close").click();
    });

    expect(getByTestId(container, "discard").textContent).toBe("false");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
