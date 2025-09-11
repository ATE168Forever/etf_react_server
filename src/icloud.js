import { transactionsToCsv, transactionsFromCsv } from './csvUtils';

export async function exportTransactionsToICloud(list) {
  if (typeof window === 'undefined' || !window.showSaveFilePicker) {
    throw new Error('File System Access API not supported');
  }
  const csv = transactionsToCsv(list);
  const handle = await window.showSaveFilePicker({
    suggestedName: 'inventory_backup.csv',
    types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] } }]
  });
  const writable = await handle.createWritable();
  await writable.write(csv);
  await writable.close();
}

export async function importTransactionsFromICloud() {
  if (typeof window === 'undefined' || !window.showOpenFilePicker) {
    throw new Error('File System Access API not supported');
  }
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] } }]
  });
  const file = await handle.getFile();
  const text = await file.text();
  return transactionsFromCsv(text);
}

