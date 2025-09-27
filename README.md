# React + Vite

This project uses React + Vite. A Dockerfile is provided for serving the built app via Nginx.

When working locally you will need to install dependencies before running lint or the development server. Use the included lockfile for reproducible installs:

```bash
pnpm install --frozen-lockfile
```

Running `pnpm install --frozen-lockfile` populates the `node_modules` folder based on `pnpm-lock.yaml` so everyone uses the same dependency versions. Without it commands like `pnpm run lint` will fail with missing package errors.

The `pnpm-lock.yaml` file should be kept under version control to guarantee identical installs in CI/CD and local environments.

## Running unit tests

Jest powers the project's unit tests. Run the entire suite locally with:

```bash
pnpm test
```

To focus on the auto-save coverage that verifies CSV, Google Drive, OneDrive, and iCloud Drive behaviour, target the specific suite:

```bash
pnpm test -- InventoryAutoSave.test.jsx
```

Codex does not run Jest automatically—you should execute the tests yourself before sending changes for review so that regressions are caught early.

If you prefer to rely on automation, the repository ships with a GitHub Actions workflow at `.github/workflows/ci.yml`. It installs dependencies with pnpm and runs `pnpm test` on every pull request targeting `main`, so opening a PR will trigger the unit test suite in GitHub's infrastructure even when Codex cannot execute the command locally.

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

## OneDrive Backup

To enable OneDrive import and export, create an Azure application with Microsoft Graph permissions (e.g. `Files.ReadWrite`).
Set your app's redirect URI to your site's origin. Then add the client ID, desired scopes, and optional authority to a `.env`
file. You can also override the Microsoft Graph base URL when using a national Azure cloud (e.g. China or US Gov) or a
sovereign deployment. The Azure portal labels map directly to the variables below:

- **Application (client) ID** → `VITE_ONEDRIVE_CLIENT_ID`
- **Directory (tenant) ID** → use it in the authority URL, e.g. `https://login.microsoftonline.com/<tenant-id>`
- **Object ID** → not required for the integration

> ℹ️ There is no separate "OneDrive ID" to configure. Supplying your Azure app's
> client ID (and optional authority or Graph base overrides) is sufficient for
> the OneDrive backup feature to authenticate and store files in the signed-in
> user's account.

```
VITE_ONEDRIVE_CLIENT_ID=your_client_id
VITE_ONEDRIVE_SCOPES=Files.ReadWrite
VITE_ONEDRIVE_AUTHORITY=https://login.microsoftonline.com/common
VITE_ONEDRIVE_GRAPH_BASE=https://graph.microsoft.com
```

Restart the development server after updating the file. Use the data menu to authorize and transfer backups with OneDrive. Each
person signs in with their own Microsoft account, and the app will prompt them to choose the desired profile if multiple
accounts are available in the browser session. Set `VITE_ONEDRIVE_AUTHORITY` to `https://login.microsoftonline.com/consumers`
when the app registration only allows personal Microsoft accounts, or to a tenant-specific authority such as
`https://login.microsoftonline.com/aae26d82-b67f-4f4e-afb8-961892572b86` when the registration is single tenant. Use the
appropriate `VITE_ONEDRIVE_GRAPH_BASE` for Azure China (`https://microsoftgraph.chinacloudapi.cn`), US Government
(`https://graph.microsoft.us`), or other clouds so API calls reach the correct Microsoft Graph endpoint.

## Google Drive Backup

The Google Drive integration relies on Google Identity Services (GIS). Create a Web
application credential in the Google Cloud console and enable the Drive API for the
project. Add your OAuth client ID and API key to a `.env` file so Vite exposes them to
the app at build time:

```
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_API_KEY=your_api_key
```

Restart the dev server after updating environment variables. When testing locally, use
the **匯出 Google Drive** option in the data menu, sign in with a Google account, and
confirm that `inventory_backup.csv` appears in Google Drive. Use **匯入 Google Drive**
to download the stored CSV and restore transactions.

Automated coverage for the GIS token flow lives in
`src/__tests__/googleDrive.test.js`. Run the targeted Drive test suite or the full Jest
suite to validate the integration before shipping changes:

```bash
pnpm test -- --runTestsByPath src/__tests__/googleDrive.test.js
pnpm test
```

## iCloud Drive Backup

The application can also import and export inventory records through the browser's file
pickers. On macOS or iOS, ensure you are signed in to iCloud and have iCloud Drive
enabled. When choosing **匯出 iCloud Drive** the browser will ask where to save
`inventory_backup.csv`; select iCloud Drive to store the file. Use **匯入 iCloud Drive**
to open the picker again and select the backup file from iCloud Drive.

## Copyright

© 2025 GiantBean. All rights reserved.

