# Improve with AI — Flashcard Back Enhancement Design

## Overview

Extend the existing "Generate with AI" button on flashcard create/edit dialogs to also support "Improve with AI". When the back field is empty, the button generates content from scratch (existing behavior). When the back field has content, the button enhances the existing back using the subject name, front content, and current back as context.

The improved content is shown as an inline preview with "Accept All" and "Preserve Original" actions.

## Architecture

### Schema (`src/features/flashcards/validation.ts`)

Extend `generateFlashcardBackSchema` with an optional `currentBack` field:

```ts
export const generateFlashcardBackSchema = z.object({
  subjectId: z.string().min(1),
  front: flashcardFrontSchema,
  currentBack: flashcardBackSchema.optional(),
});
```

Presence of `currentBack` determines mode:
- **Absent** → generate mode (create from scratch)
- **Present** → improve mode (enhance existing content)

The result type (`GenerateFlashcardBackResult`) remains unchanged: `{ success: true, back: string }`.

### Server action (`src/app/actions/flashcards.ts`)

No structural change. The existing `generateFlashcardBack` action passes parsed data through to the mutation layer, which now handles both modes.

### Mutation layer (`src/features/flashcards/mutations.ts`)

`generateFlashcardBackForUserInput` branches on `currentBack`:
- If `currentBack` is absent → calls existing `generateFlashcardBackForUser`
- If `currentBack` is present → calls new `improveFlashcardBackForUser`

### AI core (`src/features/flashcards/ai.ts`)

New function `improveFlashcardBackContent`:

- Input: `{ settings, subjectName, front, currentBack }`
- System prompt: tailored for improvement — instructs the AI to enhance clarity, precision, structure, and completeness while preserving the user's original meaning
- Max output tokens: 300 (substantive improvement, higher than generation's 100)
- Post-processing: same pipeline as generation (`normalizeGeneratedBack` → `plainTextToRichText` → `flashcardBackSchema` validation)

New system prompt for improvement mode:

```
Enhance the existing flashcard back content below.
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

Subject context: {subjectName}
Front: {front}
Current back: {currentBack}
```

New prompt builder: `buildImproveFlashcardBackPrompt({ subjectName, front, currentBack })`.

### AI service (`src/features/flashcards/ai-service.ts`)

New function `improveFlashcardBackForUser`:
- Mirrors `generateFlashcardBackForUser` pattern
- Resolves user AI settings, calls `improveFlashcardBackContent`
- Catches `AiConfigurationError` / `AiStoredCredentialError` → returns `"flashcards.ai.notConfigured"`
- Catches other errors → returns `"flashcards.ai.unavailable"`

## UI/UX

### Client hook (`src/components/flashcards/use-flashcard-dialog-state.ts`)

New state:
- `previewBack: string | null` — holds the AI-improved back content
- `showPreview: boolean` — controls inline preview visibility

Adapted `handleGenerateBack`:
1. Determines mode by checking if `currentValues.back` has rich text content
2. Calls `generateFlashcardBack` with `currentBack` set (improve) or undefined (generate)
3. If improve mode and success: sets `previewBack` and `showPreview`
4. If generate mode and success: directly sets form value (existing behavior)

New handlers:
- `handleAcceptPreview()` — writes `previewBack` into form, clears preview state
- `handleRejectPreview()` — clears preview state, keeps original form value

Preview invalidation:
- When `currentValues.front` changes while preview is showing, clear `previewBack` and `showPreview`
- When dialog closes, reset both to defaults

### Form UI (`src/components/flashcards/flashcard-dialog-form.tsx`)

**Adaptive button:**
- Empty back → label: "Generate with AI" (`t("generate_back")`)
- Non-empty back → label: "Improve with AI" (`t("improve_back")`)
- Pending state: "Generating..." or "Improving..." accordingly
- Button disabled when: no subject, no front content, generating in flight, or submitting

**Inline preview section** (rendered below the back editor when `showPreview` is true):
- Container: rounded border, muted background
- Label: "Improved version" / "Versão melhorada"
- Content: rendered HTML of the improved back
- Actions: "Accept All" (primary) and "Preserve Original" (outline)
- Both buttons show pending state during form operations

### Translations

New keys added to both `src/messages/en.json` and `src/messages/pt.json`:

| Key | EN | PT |
|-----|----|----|
| `improve_back` | "Improve with AI" | "Melhorar com IA" |
| `improving_back` | "Improving..." | "Melhorando..." |
| `improved_preview_label` | "Improved version" | "Versão melhorada" |
| `accept_all` | "Accept All" | "Aceitar Tudo" |
| `preserve_original` | "Preserve Original" | "Manter Original" |

## Error Handling

- **AI not configured:** Toast error with localized message via existing `resolveActionErrorMessage`
- **AI unavailable:** Same toast error path
- **Empty/invalid AI output:** Caught by `flashcardBackSchema` validation → mapped to unavailable error
- **Preview state on submit:** If user submits while a preview is showing, the preview is discarded — only the form's `back` field value is submitted
- **Rapid clicks:** `isGeneratingBack` guards against concurrent calls

## Edge Cases

- **Back cleared while preview showing:** Preview is discarded as stale
- **Front changes while preview showing:** Preview is invalidated and cleared
- **Edit mode:** Works identically — existing flashcards with non-empty backs show "Improve with AI"
- **User accepts preview then changes mind:** The improved content is now in the form field; user can manually edit it

## Testing

- **Unit tests:** `improveFlashcardBackContent` prompt construction, post-processing via existing `normalizeGeneratedBack` and `plainTextToRichText` utilities
- **Hook tests:** Branching logic in `handleGenerateBack` (generate vs improve), `handleAcceptPreview`, `handleRejectPreview`, preview invalidation on front change
- **No direct tests for:** `ai-service.ts`, `mutations.ts`, or server actions (per AGENTS.md rules)

## Files Changed

| File | Change |
|------|--------|
| `src/features/flashcards/validation.ts` | Add `currentBack` optional field to schema |
| `src/features/flashcards/ai.ts` | Add `improveFlashcardBackContent`, `buildImproveFlashcardBackPrompt`, `IMPROVE_MAX_TOKENS` |
| `src/features/flashcards/ai-service.ts` | Add `improveFlashcardBackForUser` |
| `src/features/flashcards/mutations.ts` | Branch `generateFlashcardBackForUserInput` on `currentBack` |
| `src/components/flashcards/use-flashcard-dialog-state.ts` | Add preview state, adapt handler, add accept/reject handlers |
| `src/components/flashcards/flashcard-dialog-form.tsx` | Adaptive button label, inline preview section |
| `src/messages/en.json` | Add translation keys |
| `src/messages/pt.json` | Add translation keys |
