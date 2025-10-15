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

The inventory screen now supports realtime backup via Firebase Authentication (Google sign-in) and Cloud Firestore. Copy `.env.example` to `.env` (or your preferred Vite environment file) inside `apps/etf-life/` and fill in the Firebase values before running the app:

```
cp apps/etf-life/.env.example apps/etf-life/.env
```

Then edit the file and paste the values from your Firebase web app configuration. When you register the web app, Firebase shows a snippet similar to:

```js
const firebaseConfig = {
  apiKey: 'AIza...your-api-key',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef',
  measurementId: 'G-XXXXXXX' // optional
};
```

Map each entry to the matching environment variable in `.env`:

```
VITE_FIREBASE_API_KEY=AIza...your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
# Optional: only if you enabled Google Analytics for this Firebase project
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
```

Only one Firebase project is required for each deployment environment. Maintainers (or anyone self-hosting the app) should create the project, enable Google sign-in and Cloud Firestore, and then share the above configuration values with the build or deployment pipeline. End users simply sign in with Google; they do **not** need to provision their own Firebase project or API key.

Each workspace is stored at `workspaces/{uid}` with `updatedAt` managed by `serverTimestamp`. IndexedDB persistence is enabled for offline support. Deploy `apps/etf-life/firestore.rules` so only the authenticated owner can read or write the workspace document.

## OneDrive, Google Drive, and iCloud Drive Backup

Environment variable documentation for the various backup providers lives inside the source files and comments. Set the values in a `.env` file at the package root so Vite exposes them to the client at build time.
