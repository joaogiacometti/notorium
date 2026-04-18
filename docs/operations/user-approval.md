# User Approval Guide

Notorium uses an approval-based access model.

Audience: admins and self-hosters.

This guide owns operational setup for the approval flow. Product behavior still belongs in `SPEC.md`.

## Live Behavior

- The first account created on a new instance becomes an approved admin automatically.
- Later accounts start with `pending` access.
- Admins can move users between `pending`, `approved`, and `blocked`.

This matches the current application behavior and is the source of truth for operational setup around approvals.

## First-Time Setup

1. Start the app using the setup flow in [README.md](../../README.md).
2. Create the first account through the normal sign-up page.
3. Sign in with that account.
4. Open the account menu and use the admin access management UI to review later users.

No manual SQL bootstrap step is required for a new instance.

## Ongoing Admin Use

Admins can:

- approve pending users
- return users to pending
- block users

Blocked and pending users cannot access authenticated app routes.

## Recovery Note

If an instance has inconsistent admin state because of manual database changes or a broken migration history, recovery is an operational database task outside the normal setup flow. Document and perform that separately instead of treating it as the standard bootstrap path.
