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

## Dropbox Backup

To enable Dropbox import and export, add your app key to a `.env` file in the project root:

```
VITE_DROPBOX_APP_KEY=your_app_key
```

Restart the development server after updating the file. The application will prompt for Dropbox authorization when using the data menu to import or export.

## OneDrive Backup

To enable OneDrive import and export, create an Azure application with Microsoft Graph permissions (e.g. `Files.ReadWrite`).
Set your app's redirect URI to your site's origin. Then add the client ID and desired scopes to a `.env` file:

```
VITE_ONEDRIVE_CLIENT_ID=your_client_id
VITE_ONEDRIVE_SCOPES=Files.ReadWrite
```

Restart the development server after updating the file. Use the data menu to authorize and transfer backups with OneDrive.

## iCloud Drive Backup

The application can also import and export inventory records through the browser's file
pickers. On macOS or iOS, ensure you are signed in to iCloud and have iCloud Drive
enabled. When choosing **匯出 iCloud Drive** the browser will ask where to save
`inventory_backup.csv`; select iCloud Drive to store the file. Use **匯入 iCloud Drive**
to open the picker again and select the backup file from iCloud Drive.

## Copyright

© 2025 GiantBean. All rights reserved.

