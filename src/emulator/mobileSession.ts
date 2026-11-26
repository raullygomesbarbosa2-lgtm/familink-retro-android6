import { parseRomFile, type ParsedRom, type RomRegion } from './romUtils';
import type { ConsoleId } from './coreRegistry';

const DB_NAME = 'familink-marshmallow-session';
const STORE_NAME = 'session';
const ROM_KEY = 'active-rom';

interface StoredRom {
  name: string;
  bytes: ArrayBuffer;
  consoleId: ConsoleId;
  region: RomRegion;
  webCore: string;
}

function openSessionDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Armazenamento temporário indisponível.'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o armazenamento temporário.'));
  });
}

export async function saveMobileRom(rom: ParsedRom | null): Promise<void> {
  const db = await openSessionDb();
  if (!rom) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(ROM_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Não foi possível limpar o armazenamento temporário.'));
      });
    } finally {
      db.close();
    }
    return;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const value: StoredRom = {
        name: rom.name,
        bytes: rom.bytes.slice().buffer,
        consoleId: rom.consoleId,
        region: rom.region,
        webCore: rom.webCore,
      };
      tx.objectStore(STORE_NAME).put(value, ROM_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Não foi possível guardar a ROM temporariamente.'));
      tx.onabort = () => reject(tx.error || new Error('O armazenamento temporário foi cancelado.'));
    });
  } finally {
    db.close();
  }
}

export async function restoreMobileRom(): Promise<ParsedRom | null> {
  const db = await openSessionDb();
  try {
    const stored = await new Promise<StoredRom | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(ROM_KEY);
      request.onsuccess = () => resolve(request.result as StoredRom | undefined);
      request.onerror = () => reject(request.error || new Error('Não foi possível restaurar a ROM.'));
    });
    if (!stored?.bytes) return null;
    return await parseRomFile(stored.name, new Uint8Array(stored.bytes), {
      consoleOverride: stored.consoleId,
      regionOverride: stored.region,
      coreOverride: stored.webCore,
    });
  } finally {
    db.close();
  }
}
