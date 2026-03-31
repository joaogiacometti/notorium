# Improve with AI — Flashcard Back Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Improve with AI" mode to the existing flashcard generate button that enhances existing back content using subject, front, and current back as context, with an inline preview and accept/reject flow.

**Architecture:** Extend the existing `generateFlashcardBack` action with an optional `currentBack` field. Presence of `currentBack` routes to a new improve pipeline in the AI layer. UI shows an inline preview with "Accept All" / "Preserve Original" actions.

**Tech Stack:** TypeScript, Next.js, React, Zod, Vercel AI SDK, React Hook Form, Vitest

---

### Task 1: Extend validation schema with `currentBack`

**Files:**
- Modify: `src/features/flashcards/validation.ts`

- [ ] **Step 1: Add `currentBack` to `generateFlashcardBackSchema`**

```ts
export const generateFlashcardBackSchema = z.object({
  subjectId: z.string().min(1),
  front: flashcardFrontSchema,
  currentBack: flashcardBackSchema.optional(),
});
```

This is the only change to this file. The inferred type `GenerateFlashcardBackForm` automatically gains the optional `currentBack` field.

- [ ] **Step 2: Run typecheck and lint**

```bash
bun run typecheck && bun run lint
```

---

### Task 2: Add improve AI core functions

**Files:**
- Modify: `src/features/flashcards/ai.ts`
- Test: `src/features/flashcards/ai.test.ts`

- [ ] **Step 1: Add constants and prompt builder to `ai.ts`**

Add after `const MAX_BACK_TOKENS = 100;` (line 7):

```ts
const IMPROVE_MAX_TOKENS = 300;
```

Add after `buildGenerateFlashcardBackPrompt` (after line 199):

```ts
export function buildImproveFlashcardBackPrompt(input: {
  subjectName: string;
  front: string;
  currentBack: string;
}): string {
  return [
    `Subject context: ${input.subjectName}`,
    `Front: ${input.front}`,
    `Current back: ${input.currentBack}`,
  ].join("\n");
}
```

- [ ] **Step 2: Add the improvement system prompt to `ai.ts`**

Add after `flashcardBackSystemPrompt` (after line 106):

```ts
export const flashcardBackImproveSystemPrompt = `Enhance the existing flashcard back content below.
Use the subject and front as context.
Improve clarity, precision, structure, and completeness.
Preserve the user's original meaning and intent.
Do not invent facts not implied by the original back.
Do not repeat, restate, or paraphrase the front.
Output must be rich-text compatible HTML: <p>, <ul>, <ol>, <li> only.
Do not use markdown, code blocks, or HTML outside these tags.
Keep the answer narrow and atomic.
If the original back is a single fact, keep it concise.
If the original back is a list, improve each point and add missing points only if directly implied by the original.
Do not add filler, disclaimers, study tips, or long explanations.
Do not use labels such as "Back:", "Answer:", "Improved:", or "Key points:".
Match the language of the front.

Subject context is allowed only as background context.
Use the subject only as background context. Improve only what the front asks about.

Bad patterns:
Front: What does DNS stand for?
Current back: Domain Name System.
Improved: Here is a detailed explanation of DNS which is a very important system that does many things including resolving names and much more.

Front: What is DNS?
Current back: Resolves domain names to IP addresses.
Improved: DNS is a complex distributed system that has many components and works in many different ways depending on the situation and configuration.
`;
```

- [ ] **Step 3: Add `improveFlashcardBackContent` function to `ai.ts`**

Add at the end of the file (after line 229):

```ts
export async function improveFlashcardBackContent(input: {
  settings: ResolvedUserAiSettings;
  subjectName: string;
  front: string;
  currentBack: string;
}): Promise<string> {
  const frontText = normalizeLine(richTextToPlainText(input.front));
  const backText = normalizeLine(richTextToPlainText(input.currentBack));

  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: generatedFlashcardBackSchema,
    system: flashcardBackImproveSystemPrompt,
    prompt: buildImproveFlashcardBackPrompt({
      subjectName: input.subjectName,
      front: frontText,
      currentBack: backText,
    }),
    maxOutputTokens: IMPROVE_MAX_TOKENS,
  });

  const back = plainTextToRichText(normalizeGeneratedBack(output.backText));
  const parsedBack = flashcardBackSchema.safeParse(back);

  if (!parsedBack.success) {
    throw new Error(
      `Invalid flashcard back generated: ${parsedBack.error.message}`,
    );
  }

  return parsedBack.data;
}
```

- [ ] **Step 4: Add tests to `ai.test.ts`**

Add at the end of `src/features/flashcards/ai.test.ts`:

```ts
describe("buildImproveFlashcardBackPrompt", () => {
  it("includes subject, front, and current back content", () => {
    const result = buildImproveFlashcardBackPrompt({
      subjectName: "Biology",
      front: "What is ATP?",
      currentBack: "ATP stores energy.",
    });

    expect(result).toContain("Subject context: Biology");
    expect(result).toContain("Front: What is ATP?");
    expect(result).toContain("Current back: ATP stores energy.");
  });
});

describe("flashcardBackImproveSystemPrompt", () => {
  it("requires preserving original meaning", () => {
    expect(flashcardBackImproveSystemPrompt).toContain(
      "Preserve the user's original meaning and intent.",
    );
  });

  it("forbids inventing new facts", () => {
    expect(flashcardBackImproveSystemPrompt).toContain(
      "Do not invent facts not implied by the original back.",
    );
  });

  it("requires matching the language of the front", () => {
    expect(flashcardBackImproveSystemPrompt).toContain(
      "Match the language of the front.",
    );
  });

  it("bans labels and wrappers in output", () => {
    expect(flashcardBackImproveSystemPrompt).toContain(
      'Do not use labels such as "Back:", "Answer:", "Improved:", or "Key points:".',
    );
  });

  it("includes bad patterns examples", () => {
    expect(flashcardBackImproveSystemPrompt).toContain("Bad patterns:");
    expect(flashcardBackImproveSystemPrompt).toContain("Current back:");
    expect(flashcardBackImproveSystemPrompt).toContain("Improved:");
  });
});
```

- [ ] **Step 5: Update the dynamic import in `ai.test.ts` to include new exports**

Change the import block (lines 5-10) to:

```ts
const {
  buildGenerateFlashcardBackPrompt,
  buildImproveFlashcardBackPrompt,
  flashcardBackSystemPrompt,
  flashcardBackImproveSystemPrompt,
  normalizeGeneratedBack,
  plainTextToRichText,
} = await import("@/features/flashcards/ai");
```

- [ ] **Step 6: Run tests to verify**

```bash
bun run test src/features/flashcards/ai.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Run typecheck and lint**

```bash
bun run typecheck && bun run lint
```

---

### Task 3: Add improve AI service function

**Files:**
- Modify: `src/features/flashcards/ai-service.ts`
- Test: `src/features/flashcards/ai-service.test.ts`

- [ ] **Step 1: Add `improveFlashcardBackForUser` to `ai-service.ts`**

Add at the end of the file:

```ts
interface ImproveFlashcardBackForUserInput {
  userId: string;
  subjectName: string;
  front: string;
  currentBack: string;
}

type ImproveFlashcardBackForUserResult =
  | { success: true; back: string }
  | {
      success: false;
      errorCode: "flashcards.ai.notConfigured" | "flashcards.ai.unavailable";
    };

export async function improveFlashcardBackForUser({
  userId,
  subjectName,
  front,
  currentBack,
}: ImproveFlashcardBackForUserInput): Promise<ImproveFlashcardBackForUserResult> {
  try {
    const settings = await resolveRequiredUserAiSettings(userId);
    const back = await improveFlashcardBackContent({
      settings,
      subjectName,
      front,
      currentBack,
    });

    return {
      success: true,
      back,
    };
  } catch (error) {
    if (
      error instanceof AiConfigurationError ||
      error instanceof AiStoredCredentialError
    ) {
      return {
        success: false,
        errorCode: "flashcards.ai.notConfigured",
      };
    }

    return {
      success: false,
      errorCode: "flashcards.ai.unavailable",
    };
  }
}
```

Add import for the new function at the top of the file:

```ts
import { improveFlashcardBackContent } from "@/features/flashcards/ai";
```

- [ ] **Step 2: Add tests to `ai-service.test.ts`**

Add at the end of the file:

```ts
describe("improveFlashcardBackForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notConfigured without consuming quota when settings are missing", async () => {
    resolveRequiredUserAiSettingsMock.mockRejectedValueOnce(
      new AiConfigurationError(),
    );

    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await improveFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
      currentBack: "ATP stores energy.",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.notConfigured",
    });
    expect(generateFlashcardBackContentMock).not.toHaveBeenCalled();
  });

  it("returns notConfigured when settings cannot be decrypted", async () => {
    resolveRequiredUserAiSettingsMock.mockRejectedValueOnce(
      new AiStoredCredentialError(),
    );

    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await improveFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
      currentBack: "ATP stores energy.",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.notConfigured",
    });
  });

  it("improves content after settings resolve successfully", async () => {
    const improveFlashcardBackContentMock = vi.fn();
    vi.doMock("@/features/flashcards/ai", () => ({
      generateFlashcardBackContent: generateFlashcardBackContentMock,
      improveFlashcardBackContent: improveFlashcardBackContentMock,
    }));

    resolveRequiredUserAiSettingsMock.mockResolvedValueOnce({
      provider: "openrouter",
      model: "openai/gpt-4.1-mini",
      apiKey: "sk-or-v1-test",
    });
    improveFlashcardBackContentMock.mockResolvedValueOnce(
      "<p>ATP stores and transfers cellular energy through phosphate bonds.</p>",
    );

    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await improveFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
      currentBack: "ATP stores energy.",
    });

    expect(result).toEqual({
      success: true,
      back: "<p>ATP stores and transfers cellular energy through phosphate bonds.</p>",
    });
  });

  it("returns unavailable for non-configuration failures", async () => {
    resolveRequiredUserAiSettingsMock.mockRejectedValueOnce(
      new Error("db down"),
    );

    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await improveFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
      currentBack: "ATP stores energy.",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.unavailable",
    });
  });
});
```

- [ ] **Step 3: Run tests to verify**

```bash
bun run test src/features/flashcards/ai-service.test.ts
```

Expected: All tests pass.

- [ ] **Step 4: Run typecheck and lint**

```bash
bun run typecheck && bun run lint
```

---

### Task 4: Branch mutation layer on `currentBack`

**Files:**
- Modify: `src/features/flashcards/mutations.ts`
- Test: `src/features/flashcards/mutations.test.ts`

- [ ] **Step 1: Import `improveFlashcardBackForUser` in `mutations.ts`**

Change the import from `ai-service` (line 4):

```ts
import {
  generateFlashcardBackForUser,
  improveFlashcardBackForUser,
} from "@/features/flashcards/ai-service";
```

- [ ] **Step 2: Update `generateFlashcardBackForUserInput` to branch on `currentBack`**

Replace the existing function (lines 217-241) with:

```ts
export async function generateFlashcardBackForUserInput(
  userId: string,
  data: GenerateFlashcardBackForm,
): Promise<GenerateFlashcardBackResult> {
  const existingSubject = await getActiveSubjectByIdForUser(
    userId,
    data.subjectId,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  if (data.currentBack) {
    const result = await improveFlashcardBackForUser({
      userId,
      subjectName: existingSubject.name,
      front: data.front,
      currentBack: data.currentBack,
    });

    if (!result.success) {
      return actionError(result.errorCode);
    }

    return { success: true, back: result.back };
  }

  const result = await generateFlashcardBackForUser({
    userId,
    subjectName: existingSubject.name,
    front: data.front,
  });

  if (!result.success) {
    return actionError(result.errorCode);
  }

  return { success: true, back: result.back };
}
```

- [ ] **Step 3: Add mock for `improveFlashcardBackForUser` in `mutations.test.ts`**

Change the mock (line 67-69):

```ts
vi.mock("@/features/flashcards/ai-service", () => ({
  generateFlashcardBackForUser: vi.fn(),
  improveFlashcardBackForUser: vi.fn(),
}));
```

- [ ] **Step 4: Add mutation tests for improve mode**

Add at the end of `mutations.test.ts`:

```ts
describe("generateFlashcardBackForUserInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls generate when currentBack is absent", async () => {
    const { generateFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );
    const { generateFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    vi.mocked(generateFlashcardBackForUser).mockResolvedValueOnce({
      success: true,
      back: "<p>Generated back</p>",
    });
    getActiveSubjectByIdForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      name: "Biology",
    });

    const result = await generateFlashcardBackForUserInput("user-1", {
      subjectId: "subject-1",
      front: "<p>What is ATP?</p>",
    });

    expect(result).toEqual({
      success: true,
      back: "<p>Generated back</p>",
    });
    expect(generateFlashcardBackForUser).toHaveBeenCalledWith({
      userId: "user-1",
      subjectName: "Biology",
      front: "<p>What is ATP?</p>",
    });
  });

  it("calls improve when currentBack is present", async () => {
    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );
    const { generateFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    vi.mocked(improveFlashcardBackForUser).mockResolvedValueOnce({
      success: true,
      back: "<p>Improved back</p>",
    });
    getActiveSubjectByIdForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      name: "Biology",
    });

    const result = await generateFlashcardBackForUserInput("user-1", {
      subjectId: "subject-1",
      front: "<p>What is ATP?</p>",
      currentBack: "<p>ATP stores energy.</p>",
    });

    expect(result).toEqual({
      success: true,
      back: "<p>Improved back</p>",
    });
    expect(improveFlashcardBackForUser).toHaveBeenCalledWith({
      userId: "user-1",
      subjectName: "Biology",
      front: "<p>What is ATP?</p>",
      currentBack: "<p>ATP stores energy.</p>",
    });
  });

  it("returns notFound when subject does not exist", async () => {
    const { generateFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    getActiveSubjectByIdForUserMock.mockResolvedValueOnce(null);

    const result = await generateFlashcardBackForUserInput("user-1", {
      subjectId: "nonexistent",
      front: "<p>Front</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });

  it("returns ai error when improve service fails", async () => {
    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );
    const { generateFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    vi.mocked(improveFlashcardBackForUser).mockResolvedValueOnce({
      success: false,
      errorCode: "flashcards.ai.notConfigured",
    });
    getActiveSubjectByIdForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      name: "Biology",
    });

    const result = await generateFlashcardBackForUserInput("user-1", {
      subjectId: "subject-1",
      front: "<p>Front</p>",
      currentBack: "<p>Existing back</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.notConfigured",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });
});
```

- [ ] **Step 5: Add mock for `getActiveSubjectByIdForUser` in `mutations.test.ts`**

Add to the mock variables section (near top of file):

```ts
const getActiveSubjectByIdForUserMock = vi.fn();
```

Add to the subjects queries mock (line 63-65):

```ts
vi.mock("@/features/subjects/queries", () => ({
  getActiveSubjectRecordForUser: getActiveSubjectRecordForUserMock,
  getActiveSubjectByIdForUser: getActiveSubjectByIdForUserMock,
}));
```

- [ ] **Step 6: Run tests to verify**

```bash
bun run test src/features/flashcards/mutations.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Run typecheck and lint**

```bash
bun run typecheck && bun run lint
```

---

### Task 5: Add translations

**Files:**
- Modify: `src/messages/en.json`
- Modify: `src/messages/pt.json`

- [ ] **Step 1: Add keys to `en.json`**

After line 594 (`"generating_back": "Generating...",`), add:

```json
"improve_back": "Improve with AI",
"improving_back": "Improving...",
```

After line 596 (`"submit": "Create Flashcard"`), before the closing `}`, add:

```json
"improved_preview_label": "Improved version",
"accept_all": "Accept All",
"preserve_original": "Preserve Original"
```

After line 607 (`"generating_back": "Generating...",` in EditFlashcardDialog), add:

```json
"improve_back": "Improve with AI",
"improving_back": "Improving...",
```

- [ ] **Step 2: Add keys to `pt.json`**

After line 594 (`"generating_back": "Gerando...",`), add:

```json
"improve_back": "Melhorar com IA",
"improving_back": "Melhorando...",
```

After line 596 (`"submit": "Criar Flashcard"`), before the closing `}`, add:

```json
"improved_preview_label": "Versão melhorada",
"accept_all": "Aceitar Tudo",
"preserve_original": "Manter Original"
```

After line 607 (`"generating_back": "Gerando...",` in EditFlashcardDialog), add:

```json
"improve_back": "Melhorar com IA",
"improving_back": "Melhorando...",
```

- [ ] **Step 3: Run lint to verify JSON validity**

```bash
bun run lint
```

---

### Task 6: Add preview state and handlers to client hook

**Files:**
- Modify: `src/components/flashcards/use-flashcard-dialog-state.ts`

- [ ] **Step 1: Add preview state variables**

Add after line 63 (`const [isGeneratingBack, setIsGeneratingBack] = useState(false);`):

```ts
const [previewBack, setPreviewBack] = useState<string | null>(null);
const [showPreview, setShowPreview] = useState(false);
```

- [ ] **Step 2: Adapt `handleGenerateBack` to support improve mode**

Replace the existing `handleGenerateBack` function (lines 222-254) with:

```ts
async function handleGenerateBack() {
  const hasBack = hasRichTextContent(currentValues.back);

  if (!hasRichTextContent(currentValues.front) || isGeneratingBack) {
    return;
  }

  setIsGeneratingBack(true);

  const result = await generateFlashcardBack({
    subjectId: currentValues.subjectId,
    front: currentValues.front,
    currentBack: hasBack ? currentValues.back : undefined,
  });

  setIsGeneratingBack(false);

  if (!result.success) {
    toast.error(resolveActionErrorMessage(result, tErrors));
    return;
  }

  if (hasBack) {
    setPreviewBack(result.back);
    setShowPreview(true);
  } else {
    form.setValue(
      "back" as Path<TValues>,
      result.back as PathValue<TValues, Path<TValues>>,
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    );
  }
}
```

- [ ] **Step 3: Adapt `canGenerateBack` computed value**

Replace lines 256-261 with:

```ts
const canGenerateBack =
  currentValues.subjectId.length > 0 &&
  hasRichTextContent(currentValues.front) &&
  !isGeneratingBack &&
  !isSubmitting;
```

Note: The `!hasRichTextContent(currentValues.back)` guard is removed since the button now works for both empty and non-empty backs.

- [ ] **Step 4: Add accept/reject preview handlers**

Add before the return statement (before line 263):

```ts
function handleAcceptPreview() {
  if (!previewBack) return;
  form.setValue(
    "back" as Path<TValues>,
    previewBack as PathValue<TValues, Path<TValues>>,
    {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    },
  );
  setPreviewBack(null);
  setShowPreview(false);
}

function handleRejectPreview() {
  setPreviewBack(null);
  setShowPreview(false);
}
```

- [ ] **Step 5: Invalidate preview when front changes**

Add a new `useEffect` after the duplicate check effect (after line 156):

```ts
useEffect(() => {
  if (showPreview) {
    setPreviewBack(null);
    setShowPreview(false);
  }
}, [currentValues.front, showPreview]);
```

- [ ] **Step 6: Reset preview state when dialog closes**

In `handleOpenChange` (line 164-183), add preview reset when `nextOpen` is false. Add after line 175 (`if (form.formState.isDirty && !isSubmitting) {`):

```ts
    setPreviewBack(null);
    setShowPreview(false);
```

- [ ] **Step 7: Export new state and handlers**

Update the return object (lines 263-280) to include the new values:

```ts
return {
  discardDialogOpen,
  setDiscardDialogOpen,
  isGeneratingBack,
  isSubmitting,
  previewBack,
  showPreview,
  keepFrontAfterSubmit,
  setKeepFrontAfterSubmit,
  keepBackAfterSubmit,
  setKeepBackAfterSubmit,
  canGenerateBack,
  isDuplicateFront,
  isCheckingDuplicateFront,
  duplicateFrontMessage: tErrors("flashcards.duplicateFront"),
  handleDiscardChanges,
  handleOpenChange,
  handleSubmit,
  handleGenerateBack,
  handleAcceptPreview,
  handleRejectPreview,
};
```

- [ ] **Step 8: Run typecheck and lint**

```bash
bun run typecheck && bun run lint
```

---

### Task 7: Update form UI with adaptive button and inline preview

**Files:**
- Modify: `src/components/flashcards/flashcard-dialog-form.tsx`

- [ ] **Step 1: Update props interface**

Add to `FlashcardDialogFormProps` (after line 57):

```ts
  previewBack: string | null;
  showPreview: boolean;
  onAcceptPreview: () => void;
  onRejectPreview: () => void;
```

- [ ] **Step 2: Destructure new props in component**

Add to the destructuring (after line 82):

```ts
  previewBack,
  showPreview,
  onAcceptPreview,
  onRejectPreview,
```

- [ ] **Step 3: Compute adaptive button labels**

Add after the `pendingSubmitLabel` computation (after line 106):

```ts
  const hasBack = hasRichTextContent(form.watch("back" as FieldPath<TValues>));
  const generateLabel = hasBack ? t("improve_back") : t("generate_back");
  const generatingLabel = hasBack ? t("improving_back") : t("generating_back");
```

- [ ] **Step 4: Update the generate button labels**

In the button (lines 247-263), change the label rendering:

Replace:
```tsx
{isGeneratingBack
  ? t("generating_back")
  : t("generate_back")}
```

With:
```tsx
{isGeneratingBack ? generatingLabel : generateLabel}
```

- [ ] **Step 5: Add inline preview section**

Add after the back `</Field>` closing tag (after line 310, before `</FieldGroup>`):

```tsx
{showPreview && previewBack && (
  <div className="rounded-lg border bg-muted/50 p-3">
    <p className="text-xs font-medium text-muted-foreground mb-2">
      {t("improved_preview_label")}
    </p>
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: previewBack }}
    />
    <div className="flex gap-2 mt-3">
      <Button type="button" size="sm" onClick={onAcceptPreview}>
        {t("accept_all")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRejectPreview}
      >
        {t("preserve_original")}
      </Button>
    </div>
  </div>
)}
```

- [ ] **Step 6: Run typecheck and lint**

```bash
bun run typecheck && bun run lint
```

---

### Task 8: Update dialog wrappers to pass new props

**Files:**
- Modify: `src/components/flashcards/create-flashcard-dialog.tsx`
- Modify: `src/components/flashcards/edit-flashcard-dialog.tsx`

- [ ] **Step 1: Update `create-flashcard-dialog.tsx`**

Find where `FlashcardDialogForm` is rendered and add the new props:

```tsx
previewBack={state.previewBack}
showPreview={state.showPreview}
onAcceptPreview={state.handleAcceptPreview}
onRejectPreview={state.handleRejectPreview}
```

- [ ] **Step 2: Update `edit-flashcard-dialog.tsx`**

Same as step 1 — find the `FlashcardDialogForm` render and add the same four props.

- [ ] **Step 3: Run typecheck and lint**

```bash
bun run typecheck && bun run lint
```

---

### Task 9: Verify end-to-end

- [ ] **Step 1: Run full test suite**

```bash
bun run test
```

Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors.

- [ ] **Step 3: Run lint**

```bash
bun run lint
```

Expected: No errors.

- [ ] **Step 4: Verify dev server starts**

```bash
bun dev &
sleep 5
curl -s http://localhost:3000 > /dev/null && echo "Dev server running" || echo "Dev server not responding"
kill %1 2>/dev/null
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add improve with AI for flashcard backs"
```
