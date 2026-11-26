import JSZip from 'jszip';

export interface LoadedCoreBlobs {
  name: string;
  js: Blob;
  wasm: Blob;
}

const coreBlobCache = new Map<string, Promise<LoadedCoreBlobs>>();

async function fetchAndExtractCore(coreName: string): Promise<LoadedCoreBlobs> {
  const safeCore = coreName.trim();
  const urls = [
    `/api/cores/${encodeURIComponent(safeCore)}`,
    `https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/${encodeURIComponent(safeCore)}_libretro.zip`,
  ];

  let zipBuffer: ArrayBuffer | null = null;
  let lastError = 'Falha ao baixar arquivo do núcleo.';

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = `HTTP ${response.status} ao baixar núcleo ${safeCore}`;
        continue;
      }
      const buf = await response.arrayBuffer();
      const bytes = new Uint8Array(buf);
      if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
        zipBuffer = buf;
        break;
      }
      lastError = `Arquivo ZIP inválido recebido para ${safeCore}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (!zipBuffer) {
    throw new Error(lastError);
  }

  const zip = await JSZip.loadAsync(zipBuffer);
  let jsData: ArrayBuffer | null = null;
  let wasmData: ArrayBuffer | null = null;

  const entries = Object.values(zip.files);
  for (const entry of entries) {
    if (entry.dir) continue;
    const lower = entry.name.toLowerCase();
    if (lower.endsWith('.js') && !jsData) {
      jsData = await entry.async('arraybuffer');
    } else if (lower.endsWith('.wasm') && !wasmData) {
      wasmData = await entry.async('arraybuffer');
    }
  }

  if (!jsData || !wasmData) {
    throw new Error(`Núcleo ${safeCore} não contém arquivos .js e .wasm válidos.`);
  }

  return {
    name: safeCore,
    js: new Blob([jsData], { type: 'application/javascript' }),
    wasm: new Blob([wasmData], { type: 'application/wasm' }),
  };
}

export function loadRetroArchCoreBlobs(coreName: string): Promise<LoadedCoreBlobs> {
  const existing = coreBlobCache.get(coreName);
  if (existing) {
    return existing;
  }
  const promise = fetchAndExtractCore(coreName).catch((err) => {
    coreBlobCache.delete(coreName);
    throw err;
  });
  coreBlobCache.set(coreName, promise);
  return promise;
}
