# Pre-push build check

To avoid deployment failures on Vercel, run a local build before pushing.

## Command

```bash
npm run build:check
```

This runs `npm run lint` then `npm run build`. If either fails, fix the errors before pushing.

## Optional: run before every push

- **Manual:** Run `npm run build:check` before `git push`.
- **Git hook:** To run automatically before push, install [husky](https://github.com/typicode/husky) and add a `pre-push` script that runs `npm run build:check`.

## CI

A GitHub Actions workflow (`.github/workflows/build.yml`) runs lint and build on push/PR to `main` (or `master`). Ensure this workflow passes before merging.
