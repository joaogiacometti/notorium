import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFlashcardDialogState } from "@/components/flashcards/use-flashcard-dialog-state";
import type { CreateFlashcardForm } from "@/features/flashcards/validation";

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

const checkFlashcardDuplicateMock = vi.fn();
const generateFlashcardBackMock = vi.fn();
const addEventListenerSpy = vi.spyOn(window, "addEventListener");
const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

vi.mock("@/app/actions/flashcards", () => ({
  checkFlashcardDuplicate: (...args: unknown[]) =>
    checkFlashcardDuplicateMock(...args),
  generateFlashcardBack: (...args: unknown[]) =>
    generateFlashcardBackMock(...args),
}));

interface HarnessProps {
  open: boolean;
  values: CreateFlashcardForm;
  onOpenChange?: (open: boolean) => void;
  onSubmitAction?: (values: CreateFlashcardForm) => Promise<{ success: true }>;
  getSuccessValues?: (values: CreateFlashcardForm) => CreateFlashcardForm;
}

function TestHarness({
  open,
  values,
  onOpenChange = () => {},
  onSubmitAction = async () => ({ success: true }),
  getSuccessValues = (currentValues) => currentValues,
}: Readonly<HarnessProps>) {
  const form = useForm<CreateFlashcardForm>({
    defaultValues: values,
  });
  const dialog = useFlashcardDialogState({
    mode: "create",
    open,
    onOpenChange,
    values,
    form,
    onSubmitAction,
    getSuccessValues: (currentValues) => getSuccessValues(currentValues),
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
      <output data-testid="checking">
        {dialog.isCheckingDuplicateFront ? "true" : "false"}
      </output>
      <button
        type="button"
        data-testid="submit"
        onClick={() => dialog.handleSubmit(form.getValues())}
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

async function flushTimers() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
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
    checkFlashcardDuplicateMock.mockReset();
    generateFlashcardBackMock.mockReset();
    checkFlashcardDuplicateMock.mockResolvedValue({
      success: true,
      duplicate: false,
    });
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
            subjectId: "subject-1",
            front: "<p>Front A</p>",
            back: "<p>Back A</p>",
          }}
        />,
      );
    });

    await flushTimers();

    await act(async () => {
      root.render(
        <TestHarness
          open
          values={{
            subjectId: "subject-2",
            front: "<p>Front B</p>",
            back: "<p>Back B</p>",
          }}
        />,
      );
    });

    expect(getByTestId(container, "subjectId").textContent).toBe("subject-2");
    expect(getByTestId(container, "front").textContent).toBe("<p>Front B</p>");
    expect(getByTestId(container, "back").textContent).toBe("<p>Back B</p>");
  });

  it("rechecks duplicate status after a successful submit resets to kept values", async () => {
    const onSubmitAction = vi.fn().mockResolvedValue({ success: true });

    await act(async () => {
      root.render(
        <TestHarness
          open
          values={{
            subjectId: "subject-1",
            front: "<p>Front A</p>",
            back: "<p>Back A</p>",
          }}
          onSubmitAction={onSubmitAction}
          getSuccessValues={(currentValues) => currentValues}
        />,
      );
    });

    await flushTimers();
    expect(checkFlashcardDuplicateMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      getByTestId(container, "submit").click();
    });

    await flushTimers();

    expect(onSubmitAction).toHaveBeenCalledWith({
      subjectId: "subject-1",
      front: "<p>Front A</p>",
      back: "<p>Back A</p>",
    });
    expect(checkFlashcardDuplicateMock).toHaveBeenCalledTimes(2);
    expect(checkFlashcardDuplicateMock).toHaveBeenLastCalledWith({
      id: undefined,
      front: "<p>Front A</p>",
    });
  });

  it("registers beforeunload when AI back proposal is pending", async () => {
    generateFlashcardBackMock.mockResolvedValueOnce({
      success: true,
      back: "<p>Generated improved back</p>",
    });

    function ProposalHarness() {
      const form = useForm<CreateFlashcardForm>({
        defaultValues: {
          subjectId: "subject-1",
          front: "<p>Front A</p>",
          back: "<p>Back A</p>",
        },
      });
      const dialog = useFlashcardDialogState({
        mode: "create",
        open: true,
        onOpenChange: () => {},
        values: {
          subjectId: "subject-1",
          front: "<p>Front A</p>",
          back: "<p>Back A</p>",
        },
        form,
        onSubmitAction: async () => ({ success: true }),
        getSuccessValues: (currentValues) => currentValues,
        closeOnSuccess: false,
      });

      return (
        <button
          type="button"
          data-testid="generate-back"
          onClick={() => void dialog.handleGenerateBack()}
        />
      );
    }

    await act(async () => {
      root.render(<ProposalHarness />);
    });

    await act(async () => {
      getByTestId(container, "generate-back").click();
    });

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });
});
