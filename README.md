# ETF Life Monorepo

This repository now hosts multiple front-end applications that share the same pnpm workspace. Each project lives under `apps/`:

- `apps/etf-life` – the original ETF Life experience.
- `apps/budget-life` – the new Budget Life prototype.

Install dependencies once at the workspace root (this pulls packages for every app):

```bash
pnpm install --frozen-lockfile
```

## Running the apps locally

Use the workspace scripts to start the desired development server:

```bash
pnpm dev:etf-life     # ETF Life
pnpm dev:budget-life  # Budget Life
```

The commands proxy to each package's local `pnpm dev` script so hot module reload and Vite configuration remain isolated per app.

## Building, linting, and testing

Run the standard automation across all workspaces:

```bash
pnpm build   # builds every app
pnpm lint    # lints every app
pnpm test    # runs the ETF Life Jest suite
```

Individual packages still expose their own scripts (`pnpm --filter <app> <command>`) if you prefer to target a single project.

## ETF Life testing notes

Jest powers the ETF Life unit tests. The suite and targeted commands continue to work from inside the package directory:

```bash
pnpm --filter etf-life test
pnpm --filter etf-life test -- --runTestsByPath tests/googleDrive.test.js
```

Refer to the documentation in `apps/etf-life/README.md` (if present) for additional ETF-specific guidance.

## Budget Life

The Budget Life folder contains a lightweight Vite + React scaffold with example UI components. It is intentionally decoupled from the ETF codebase so the two products can evolve independently while sharing tooling through the pnpm workspace.

## Copyright

© 2025 GiantBean. All rights reserved.
