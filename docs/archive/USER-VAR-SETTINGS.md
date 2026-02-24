# User Var Settings (Option A)

## Purpose

The `userVarSettings` collection is an **optional** store for user-specific vars (e.g. future Dashboard Settings overrides). It is kept separate from the main `users` collection so experiments and new var types can be tested without touching production user documents.

## When it is used

- **Only when** `USE_USER_VAR_SETTINGS_COLLECTION=true` in the environment (e.g. `.env.local` or Vercel).
- When the flag is **not** set, `getUserVarSettings` always returns `null` and `setUserVarSettings` is a no-op.

## What stays on `users`

Existing fields (e.g. `anthropicApiKey`, `githubToken`, `tokenAllowance`, `tokensUsedThisPeriod`, Stripe fields) remain on the `users` collection. **No migration** of those fields is done in this phase.

## API

- **`getUserVarSettings(userId: string)`** — Returns `Promise<Record<string, unknown> | null>`. Document shape: `{ userId, vars, updatedAt }`; only `vars` is returned.
- **`setUserVarSettings(userId: string, vars: Record<string, unknown>)`** — Upserts by `userId`. No-op if flag is off.

## Implementation

- Module: `src/lib/userVarSettings.ts`
- Uses the same DB as the rest of the app (`@/lib/db`, `DB_NAME`).
- Collection name: `userVarSettings`.
