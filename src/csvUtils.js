export function encodeCsvCode(code) {
  return `="${code}"`;
}

export function decodeCsvCode(raw) {
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('="') && trimmed.endsWith('"')) {
    return trimmed.slice(2, -1);
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
