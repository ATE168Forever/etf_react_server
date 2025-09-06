# React + Vite

This project uses React + Vite. A Dockerfile is provided for serving the built app via Nginx.

When working locally you will need to install dependencies before running lint or the development server. Use the included lockfile for reproducible installs:

```bash
pnpm install --frozen-lockfile
```

Running `pnpm install --frozen-lockfile` populates the `node_modules` folder based on `pnpm-lock.yaml` so everyone uses the same dependency versions. Without it commands like `pnpm run lint` will fail with missing package errors.

The `pnpm-lock.yaml` file should be kept under version control to guarantee identical installs in CI/CD and local environments.

To build and run the production image the Dockerfile also installs dependencies from the lockfile:

```bash
docker build -t etf-view .
docker run -p 3000:80 etf-view
```

Rebuild the image whenever dependencies change so the container has the correct `node_modules`.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Data Export

### Google Drive backup
The About tab offers a one-click backup that saves encrypted app data to the user's Google Drive `appDataFolder`. This feature uses OAuth and does **not** require any URL configuration.

## Copyright

© 2025 GiantBean. All rights reserved.

