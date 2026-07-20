# ETF Life (apps/dividend-life)

This package contains the original ETF Life React + Vite application. Install dependencies from the repository root and then run the package scripts via pnpm workspaces.

```bash
pnpm --filter dividend-life dev
pnpm --filter dividend-life build
pnpm --filter dividend-life lint
pnpm --filter dividend-life test
```

## Unit tests

Jest powers the ETF Life unit tests. Run the entire suite locally with:

```bash
pnpm --filter dividend-life test
```

To focus on the auto-save coverage that verifies CSV and Google Drive behaviour, target the specific suite:

```bash
pnpm --filter dividend-life test InventoryAutoSave.test.jsx
```

To specify a full test file path instead, use:

```bash
pnpm --filter dividend-life test --runTestsByPath tests/InventoryAutoSave.test.jsx
```

Codex does not run Jest automatically—you should execute the tests yourself before sending changes for review so that regressions are caught early.

If you prefer to rely on automation, the repository ships with a GitHub Actions workflow at `.github/workflows/ci.yml`. It installs dependencies with pnpm and runs `pnpm --filter dividend-life test` on every pull request targeting `main`.

## Docker image

To build and run the production image the Dockerfile also installs dependencies from the lockfile:

```bash
cd apps/dividend-life
docker build -t etf-view .
docker run -p 3000:80 etf-view
```

Rebuild the image whenever dependencies change so the container has the correct `node_modules`.

## Google Drive Backup

Environment variable documentation for the backup provider lives inside the source files and comments. Set the values in a `.env` file at the frontend workspace root (`etf_react_server/`) so Vite exposes them to the client at build time.
