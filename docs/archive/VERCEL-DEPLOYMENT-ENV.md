# Vercel deployment – environment variables

All of the following must be set for a full GRIP deployment (no optional vars for core features).

## Required

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Database (e.g. Atlas). |
| `NEXTAUTH_URL` | Production URL (e.g. `https://your-domain.vercel.app`). |
| `NEXTAUTH_SECRET` | Session signing. |
| `ANTHROPIC_API_KEY` | G.R.I.P. chat / AI. |
| `GITHUB_TOKEN` or `GITHUB_ACCESS_TOKEN` | Export to GitHub and repo clone. |
| `VERCEL_TOKEN` | Deploy to Vercel from project overview. |

## Optional

| Variable | Purpose |
|----------|---------|
| `VERCEL_TEAM_ID` | If deploying under a Vercel team. |

GitHub OAuth (`GITHUB_ID`, `GITHUB_SECRET`) and user GitHub token in settings are separate; server token above is for Export and clone.
