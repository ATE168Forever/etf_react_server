# ETF Life (apps/etf-life)

This package contains the original ETF Life React + Vite application. Install dependencies from the repository root and then run the package scripts via pnpm workspaces.

```bash
pnpm --filter etf-life dev
pnpm --filter etf-life build
pnpm --filter etf-life lint
pnpm --filter etf-life test
```

## Unit tests

Jest powers the ETF Life unit tests. Run the entire suite locally with:

```bash
pnpm --filter etf-life test
```

To focus on the auto-save coverage that verifies CSV, Google Drive, OneDrive, and iCloud Drive behaviour, target the specific suite:

```bash
pnpm --filter etf-life test -- InventoryAutoSave.test.jsx
```

Codex does not run Jest automatically—you should execute the tests yourself before sending changes for review so that regressions are caught early.

If you prefer to rely on automation, the repository ships with a GitHub Actions workflow at `.github/workflows/ci.yml`. It installs dependencies with pnpm and runs `pnpm --filter etf-life test` on every pull request targeting `main`.

## Docker image

To build and run the production image the Dockerfile also installs dependencies from the lockfile:

```bash
cd apps/etf-life
docker build -t etf-view .
docker run -p 3000:80 etf-view
```

Rebuild the image whenever dependencies change so the container has the correct `node_modules`.

## Firebase realtime sync

The inventory screen now supports realtime backup via Firebase Authentication (Google sign-in) and Cloud Firestore. Configure the following variables in `apps/etf-life/.env` (or your preferred Vite environment file) before running the app:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Only one Firebase project is required for each deployment environment. Maintainers (or anyone self-hosting the app) should create the project, enable Google sign-in and Cloud Firestore, and then share the above configuration values with the build or deployment pipeline. End users simply sign in with Google; they do **not** need to provision their own Firebase project or API key.

Each workspace is stored at `workspaces/{uid}` with `updatedAt` managed by `serverTimestamp`. IndexedDB persistence is enabled for offline support. Deploy `apps/etf-life/firestore.rules` so only the authenticated owner can read or write the workspace document.

## OneDrive, Google Drive, and iCloud Drive Backup

Environment variable documentation for the various backup providers lives inside the source files and comments. Set the values in a `.env` file at the package root so Vite exposes them to the client at build time.
