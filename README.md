# React + Vite

This project uses React + Vite. A Dockerfile is provided for serving the built app via Nginx.

When working locally you will need to install dependencies before running lint or the development server:

```bash
npm ci
```

Running `npm ci` (or `npm install`) populates the `node_modules` folder which ESLint relies on. Without it commands like `npm run lint` will fail with missing package errors.

To build and run the production image:

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
