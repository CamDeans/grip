# Anthropic API usage across G.R.I.P.

All areas that use the Anthropic API (Claude) now share the same config and key checks so they behave consistently.

## Required env

- **`ANTHROPIC_API_KEY`** – Set in `.env.local` (local) or Vercel Environment Variables (production). Get a key from [Claude API Keys](https://platform.claude.com/settings/keys).

## Optional env (model overrides)

- **`ANTHROPIC_MODEL_CHAT`** – Default: `claude-3-sonnet-20240229` (chat, planning, code gen)
- **`ANTHROPIC_MODEL_OPUS`** – Default: `claude-3-opus-20240229` (heavier chat / reasoning)
- **`ANTHROPIC_MODEL_FAST`** – Default: `claude-3-haiku-20240307` (health check, validation pings)

## Central config

- **`src/lib/anthropicConfig.ts`**
  - `getAnthropicApiKey()` – returns key or `undefined`
  - `requireAnthropicApiKey()` – returns key or throws
  - `ANTHROPIC_MODEL_CHAT`, `ANTHROPIC_MODEL_OPUS`, `ANTHROPIC_MODEL_FAST` – used by routes and `anthropicService`

## API routes that use Anthropic

| Route | Purpose | Key check |
|-------|---------|-----------|
| `GET /api/health/anthropic` | Health check; validates key and connectivity | Uses `getAnthropicApiKey()` |
| `POST /api/enhanced-chat` | Main G.R.I.P. chat (project context) | 503 if key missing |
| `POST /api/chat` | Legacy chat (Socket.IO path) | 503 if key missing |
| `POST /api/ai/chat` | AI chat with project context | 503 if key missing |
| `POST /api/chat/completion` | Chat completion (project state) | 503 if key missing |
| `POST /api/projects/[id]/repo/summarize` | Repo file summaries for context | 503 if key missing |

## Services that use Anthropic

- **`anthropicService`** (`src/lib/services/anthropicService.ts`) – Singleton used by enhanced-chat and summarize; uses `getAnthropicApiKey()` and `ANTHROPIC_MODEL_CHAT` / `ANTHROPIC_MODEL_FAST`.
- **Other libs** (templateEngine, structureGenerator, planGenerator, languageSupport, commandGenerator, aiService, analysis, ai, server/anthropic) – Each has its own client and `ANTHROPIC_API_KEY`; they are used from flows that already require a key (e.g. planning, code gen). Model IDs can be switched to use `anthropicConfig` in a later pass if desired.

## Verifying that Anthropic works

1. Set `ANTHROPIC_API_KEY` in `.env.local`.
2. Restart the dev server.
3. Open **`GET /api/health/anthropic`** (e.g. `http://localhost:3000/api/health/anthropic`).
   - **200** and `"anthropic": "connected"` → key is valid and all above routes can use it.
   - **503** → response body explains the error (e.g. key missing or invalid).
