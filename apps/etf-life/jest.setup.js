import '@testing-library/jest-dom';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const result = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

const cwd = process.cwd();
const developmentEnvPath = resolve(cwd, '.env.development');
const exampleEnvPath = resolve(cwd, '.env.example');

const developmentEnv = parseEnvFile(developmentEnvPath);
const exampleEnv = Object.keys(developmentEnv).length
  ? {}
  : parseEnvFile(exampleEnvPath);

const mergedEnv = { ...exampleEnv, ...developmentEnv };

for (const [key, value] of Object.entries(mergedEnv)) {
  if (typeof process.env[key] === 'undefined') {
    process.env[key] = value;
  }
}

if (typeof globalThis !== 'undefined') {
  const currentAppEnv =
    typeof globalThis.__APP_ENV__ === 'object' && globalThis.__APP_ENV__
      ? globalThis.__APP_ENV__
      : {};

  globalThis.__APP_ENV__ = {
    ...currentAppEnv,
    ...mergedEnv
  };
}
