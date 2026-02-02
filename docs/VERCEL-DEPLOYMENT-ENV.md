# Environment Variables for Vercel Deployment

Set these in **Vercel → Project → Settings → Environment Variables**. Use **Production** (and optionally Preview) for each.

---

## Required (app will fail without these)

| Variable | Description | Example (don’t copy secrets) |
|----------|-------------|------------------------------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/...` |
| `NEXTAUTH_SECRET` | Secret for NextAuth session signing (min 32 chars) | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | **Full public URL of your app** (no trailing slash) | `https://your-app.vercel.app` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | From GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | From GitHub OAuth App |
| `ANTHROPIC_API_KEY` | Anthropic API key (for AI/chat) | `sk-ant-api03-...` |

**Important:** For `NEXTAUTH_URL` use your real Vercel URL, e.g. `https://grip-xxx.vercel.app`. After the first deploy Vercel shows it; you can also use a custom domain. Then add this **Authorization callback URL** in your GitHub OAuth App:

- `https://your-app.vercel.app/api/auth/callback/github`  
  (or your custom domain + `/api/auth/callback/github`)

---

## Optional (recommended or feature-specific)

| Variable | Description | When to set |
|----------|-------------|-------------|
| `GITHUB_ACCESS_TOKEN` or `GITHUB_TOKEN` | GitHub PAT (e.g. repo scope) | If you use GitHub repo search / content in the app |
| `JWT_SECRET` | JWT signing secret | If your app uses JWT outside NextAuth |
| `ENCRYPTION_KEY` | 32-byte key for encrypted fields (e.g. Mongo) | Only if you use encryption in mongoService/db |
| `INTERNAL_API_KEY` | Key for internal API calls (e.g. notifications) | Only if you call those APIs with a key |

---

## WebSocket (optional; often disabled on Vercel)

Serverless functions don’t keep long-lived WebSockets. To avoid errors, you can disable WebSocket features in production:

| Variable | Value | Effect |
|----------|--------|--------|
| `NEXT_PUBLIC_DISABLE_WEBSOCKETS` | `true` | Disables WebSocket usage in the client |
| `DISABLE_WEBSOCKETS` | `true` | Disables WebSocket on server/API |

If you later run a separate WebSocket server (e.g. Railway, Render), set:

- `NEXT_PUBLIC_ENABLE_WEBSOCKET` = `true`
- `NEXT_PUBLIC_WEBSOCKET_URL` = `wss://your-ws-server.com`  
  (and optionally `NEXT_PUBLIC_WS_PORT` if the client uses it)

---

## Do **not** set on Vercel

- `NEXT_PUBLIC_IS_BROWSER` – dev-only.
- `GITHUB_CALLBACK_URL` – NextAuth ignores it; callback is built from `NEXTAUTH_URL`.
- `WS_PORT`, `FORCE_WS_SERVER`, `FORCE_SOCKET_SERVER`, `TERMINAL_PORT` – for a local WebSocket/terminal server; not used in serverless.

---

## Checklist

1. Add all **Required** variables in Vercel.
2. Set `NEXTAUTH_URL` to your Vercel URL (or custom domain).
3. In GitHub OAuth App, add **Authorization callback URL**: `https://<your-vercel-domain>/api/auth/callback/github`.
4. (Recommended) Set `NEXT_PUBLIC_DISABLE_WEBSOCKETS` = `true` for Production unless you have a separate WebSocket server.
5. Redeploy after changing env vars (or use “Redeploy” with “Use existing Build Cache” off if needed).
