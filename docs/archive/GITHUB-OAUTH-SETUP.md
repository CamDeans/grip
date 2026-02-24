# GitHub OAuth (Sign in with GitHub) Setup

The "redirect_uri is not associated with this application" error means your **GitHub OAuth App** has not been given the exact callback URL that NextAuth uses.

## Fix: Add the callback URL in GitHub

1. **Open your GitHub OAuth App**
   - Go to [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
   - Click your application (the one whose **Client ID** is in your `.env.local` as `GITHUB_CLIENT_ID`).

2. **Set the Authorization callback URL**
   - In the OAuth App form, find **"Authorization callback URL"**.
   - Set it to **exactly** one of these (depending on where you run the app):

   | Environment | Callback URL |
   |-------------|--------------|
   | **Local**   | `http://localhost:3000/api/auth/callback/github` |
   | **Production** | `https://your-domain.com/api/auth/callback/github` |

   - For local dev, use: **`http://localhost:3000/api/auth/callback/github`**
   - No trailing slash. Must be `http` for localhost (unless you use HTTPS locally).

3. **Save** the OAuth App.

4. **Retry** "Sign in with GitHub" on your app.

## Notes

- `NEXTAUTH_URL` in `.env` / `.env.local` must match the origin of the URL you use in the browser (e.g. `http://localhost:3000`). NextAuth builds the callback as `{NEXTAUTH_URL}/api/auth/callback/github`.
- If you deploy to a custom domain or Vercel, add that callback URL in GitHub as well (e.g. `https://your-app.vercel.app/api/auth/callback/github`).
- `GITHUB_CALLBACK_URL` in your env is **not** used by NextAuth; the callback is derived from `NEXTAUTH_URL`. You can remove `GITHUB_CALLBACK_URL` or keep it for other tooling, but the OAuth App must list the URL in the table above.
