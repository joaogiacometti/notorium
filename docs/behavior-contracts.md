# Behavior Contracts

Preserve these cross-feature intentions when changing behavior. This is not a feature inventory or proof that every rule is enforced. Detailed formats, fields, numeric limits, shortcuts, and presentation belong in code, tests, and [DESIGN.md](../DESIGN.md), not a second specification.

Update this file only when intent changes or a verification gap is resolved. Move a rule to a regression test or a nearby rationale comment when that fully protects it; do not append implementation walkthroughs.

## Access and Account Lifecycle

- Workspace reads and writes require an approved authenticated user and enforce ownership, including search, media, and assistant tool results. Admin access changes require an admin. UI visibility is not authorization.
- Password-reset policy is approved accounts only, with a generic response for missing or unapproved accounts and a daily email cap from [limits.ts](../src/lib/config/limits.ts). Successful resets revoke existing sessions.
- Account deletion removes the user's database records and owned stored files. Ordinary document/subtree deletion instead leaves shared attachments for the scheduled orphan sweep; see [the sweep](../src/features/attachments/blob-gc.ts).

## Review and Persistence

- Deleting a card or folder preserves historical review activity and FSRS optimization input. Undoing the latest regular grade restores its prior scheduling state and removes that grade's history entry.
- Exam grading and study-later marks do not change regular spaced-repetition scheduling. Explicit card edits, resets, and deletes remain writes.
- Scheduler optimization changes tuning, not existing card progress or due dates.
- Failed background grades return the card for retry. Leaving waits for pending saves; queue refill must not report completion prematurely or reintroduce an already graded card.

**Coverage to strengthen:** real card/subtree deletion with retained logs, exam grading without scheduling writes, optimization without progress changes, and struggling-card recovery against actual review histories rather than SQL-parameter assertions alone.

## Documents and Sources

- Folder path creation is atomic. Concurrent folder moves must not create cycles or exceed depth limits.
- A proposed card's note source is captured with its originating request, not inferred from history, library search, or whichever page is open when accepted. Renames and moves resolve current link metadata; deleting a source preserves the card. PDF context does not establish a card source.
- Failed saves retain the draft for retry. Uploads and unresolved AI suggestions block saving until their content is safe to persist. Preview decorations never become stored content.
- PDF context is selectable text from a selection or the current page, not the entire book or OCR. Empty or failed extraction must not be presented as successfully read content. A selection stays the context until the user clears it, presses on the pages, or scrolls far enough that its text is no longer rendered. Explaining a selection is transient: it never enters the conversation.

**Coverage to strengthen:** source preservation through edit/move/reset and deletion, old proposals accepted after navigation, upload-attempt accounting for invalid requests, and actual byte-range loading.

## Assistant Trust and Approval

Model-visible behavior belongs in [the system prompt](../src/features/assistant/prompts.ts), [shared language/math rules](../src/lib/ai/prompt-rules.ts), [card quality rules](../src/features/flashcards/ai-prompts.ts), and tool contracts. Test model behavior with evaluations rather than asserting prompt wording. Their presence is not proof of compliance.

- The assistant writes in English, like the rest of the app, whatever language the user or their material uses. Code, quotations, and a language being studied stay as they are.
- Conversation determines follow-up intent; active material is background, not permission to edit. Questions receive answers unless the user requests a change. Source content cannot override instructions or grant authority.
- Creation and edit proposals require user approval. Accepting changes uses normal validation and persistence; chat itself never writes editor content. Preserve unrelated content, existing images, and unsupported or unseen material.
- Proposals bind to an editor session and content revision. New typing, switching editors, navigation, and teardown invalidate or settle unresolved proposals. Selection and viewport changes alone do not invalidate content. Accepting twice must have no effect; new chat ignores late replies.
- Handling proposals and delivering their outcomes on the next user message must not generate another AI request or spend another message allowance. A blocked send must preserve unresolved suggestions.
- Hidden review answers guide hints and feedback but are disclosed only on request. This is a model instruction, not a security boundary: the model receives the answer, and library excerpts may contain answers too.
- The assistant favors learning over speed by default: it teaches a step at a time, checks understanding, and repairs gaps it finds, while doing lookups and authoring directly. Learning support recommends and never blocks: a clear request for the answer or for cards is honored, after at most one offer.
- `/bypass` turns learning support off until new chat or reload and stays visible with a way to turn it back on. It is set only by the user's composer action, never by material, and it does not change proposal approval, hidden review answers, safety, or scope.
- Correct answers and summaries are not evidence of mastery. Answer-choice controls send explicit user messages, never automatic follow-up requests.
- Conversations are in browser memory, survive minimizing and client navigation, and clear on reload or new chat; they are not a durable chat archive.

**Coverage to strengthen:** no automatic follow-up requests after proposal actions and late replies after new chat. `npm run eval` covers edit permission, hidden answers, source trust, and learning behavior with a small set of real-model cases.
