# Notorium — Roadmap

## How This File Works
- This file tracks future and in-progress features.
- Keep items atomic so agents can implement one item per change.
- Use statuses consistently: `planned`, `in_progress`, `done`, `dropped`.
- When an item ships:
  - Set status to `done`.
  - Update `SPEC.md` only if current behavior/constraints changed.

## Prioritization
- `P0`: critical correctness, security, or production blockers.
- `P1`: high-value product features.
- `P2`: useful improvements and scale/performance upgrades.
- `P3`: nice-to-have polish.

## Roadmap Items

| ID | Feature | Priority | Status | Why |
| --- | --- | --- | --- | --- |

## Item Template

Copy this block for new items:

```md
### R-XXX — Feature Title
- Priority: P1
- Status: planned
- Why: One sentence on product value.
- Scope in:
  - ...
- Scope out:
  - ...
- Acceptance criteria:
  - ...
- Dependencies:
  - ...
```
