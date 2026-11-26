import JSZip from 'jszip';
import {
  detectConsoleFromExtension,
  getConsoleSpecById,
  SONY_BLOCKED_EXTENSIONS,
  type ConsoleId,
} from './coreRegistry';

export type RomRegion = 'USA' | 'JPN' | 'EUR' | 'WORLD';

export interface ParsedRom {
  name: string;
  consoleId: ConsoleId;
  consoleName: string;
  webCore: string;
  usesJsNesDirect: boolean;
  size: number;
  sha256: string;
  crc32: string;
  region: RomRegion;
  regionLabel: string;
  tvSystem: 'NTSC' | 'PAL';
  bytes: Uint8Array;
  binaryString: string;
}

export interface RomMatchResult {
  ok: boolean;
  reason?: 'REGION_MISMATCH' | 'HASH_MISMATCH';
  message: string;
}

export const REGION_LABELS: Record<RomRegion, string> = {
  USA: 'Estados Unidos (NTSC-U)',
  JPN: 'Japão (NTSC-J)',
  EUR: 'Europa (PAL)',
  WORLD: 'Mundial (Multi-Região)',
};

export function uint8ToBinaryString(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return chunks.join('');
}

export async function computeSha256(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const hashBuffer = await crypto.subtle.digest('SHA-256', copy.buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function computeCrc32(bytes: Uint8Array): string {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function detectRomRegion(
  fileName: string,
  bytes: Uint8Array,
  consoleId: ConsoleId
): { region: RomRegion; tvSystem: 'NTSC' | 'PAL' } {
  const upper = fileName.toUpperCase();

  if (/\(J\)|\(JAPAN\)|\(JP\)|\[J\]|\(NTSC-J\)|\(FDS\)|FAMICOM/i.test(upper)) {
    return { region: 'JPN', tvSystem: 'NTSC' };
  }
  if (/\(U\)|\(USA\)|\(US\)|\[U\]|\(NTSC-U\)/i.test(upper)) {
    return { region: 'USA', tvSystem: 'NTSC' };
  }
  if (/\(E\)|\(EUROPE\)|\(EUR\)|\[E\]|\(PAL\)/i.test(upper)) {
    return { region: 'EUR', tvSystem: 'PAL' };
  }
  if (/\(W\)|\(WORLD\)|\(JU\)|\(UE\)/i.test(upper)) {
    return { region: 'WORLD', tvSystem: 'NTSC' };
  }

  if (consoleId === 'nes' && bytes.length >= 16) {
    const isPal = (bytes[9] & 0x01) === 1 || (bytes[10] & 0x03) === 2;
    return { region: isPal ? 'EUR' : 'USA', tvSystem: isPal ? 'PAL' : 'NTSC' };
  }

  if ((consoleId === 'gb' || consoleId === 'gbc') && bytes.length > 0x014a) {
    return bytes[0x014a] === 0x00
      ? { region: 'JPN', tvSystem: 'NTSC' }
      : { region: 'USA', tvSystem: 'NTSC' };
  }

  if (consoleId === 'gba' && bytes.length > 0xb0) {
    const countryChar = String.fromCharCode(bytes[0xaf]);
    if (countryChar === 'J') return { region: 'JPN', tvSystem: 'NTSC' };
    if (countryChar === 'P' || countryChar === 'D' || countryChar === 'F') {
      return { region: 'EUR', tvSystem: 'PAL' };
    }
    return { region: 'USA', tvSystem: 'NTSC' };
  }

  if (consoleId === 'megadrive' && bytes.length > 0x1f3) {
    const reg = String.fromCharCode(bytes[0x1f0], bytes[0x1f1], bytes[0x1f2]).toUpperCase();
    if (reg.includes('J') && !reg.includes('U')) return { region: 'JPN', tvSystem: 'NTSC' };
    if (reg.includes('E') && !reg.includes('U')) return { region: 'EUR', tvSystem: 'PAL' };
    return { region: 'USA', tvSystem: 'NTSC' };
  }

  if (consoleId === 'snes' && bytes.length > 0x8000) {
    const offset = bytes.length % 1024 === 512 ? 512 : 0;
    const countryLo = bytes[offset + 0x7fd9] ?? 1;
    if (countryLo === 0) return { region: 'JPN', tvSystem: 'NTSC' };
    if (countryLo >= 2 && countryLo <= 13) return { region: 'EUR', tvSystem: 'PAL' };
    return { region: 'USA', tvSystem: 'NTSC' };
  }

  return { region: 'USA', tvSystem: 'NTSC' };
}

function isArcadeConsoleId(id: ConsoleId): boolean {
  return ['arcade', 'arcade2000', 'arcade2003', 'arcade2003plus', 'arcade2010', 'arcade2013', 'arcade2013plus', 'neogeo'].includes(id);
}

export async function parseRomFile(
  fileName: string,
  bytes: Uint8Array,
  options?: { regionOverride?: RomRegion; consoleOverride?: ConsoleId; coreOverride?: string }
): Promise<ParsedRom> {
  if (bytes.length < 16) {
    throw new Error('Arquivo ROM inválido: tamanho menor que 16 bytes.');
  }
  if (bytes.length > 67108864) {
    throw new Error('Arquivo excede o limite de 64 MB.');
  }

  const lower = fileName.toLowerCase();
  for (const blocked of SONY_BLOCKED_EXTENSIONS) {
    if (lower.endsWith(blocked)) {
      throw new Error(
        `Formato ${blocked} pertencente a consoles Sony não é suportado. Este emulador inclui apenas núcleos clássicos sem Sony.`
      );
    }
  }

  // Rejeita .7z ou .rar antes de enviar lixo para o núcleo
  if (
    (bytes[0] === 0x37 && bytes[1] === 0x7a && bytes[2] === 0xbc && bytes[3] === 0xaf) ||
    (bytes[0] === 0x52 && bytes[1] === 0x61 && bytes[2] === 0x72 && bytes[3] === 0x21)
  ) {
    throw new Error(
      'Arquivo compactado em 7z/RAR detectado. Extraia o arquivo para .sms / .sfc / .zip antes de carregar.'
    );
  }

  let effectiveName = fileName;
  let effectiveBytes = bytes;

  // ZIP é compartilhado por ROMs de console e pacotes Arcade; a escolha explícita no seletor evita confundir os dois.
  const isZipBytes = bytes[0] === 0x50 && bytes[1] === 0x4b;
  // ZIP é o formato padrão dos jogos Arcade. No modo automático, nunca abrimos
  // arquivos internos como .sms: isso era o que fazia um ZIP Arcade aparecer
  // indevidamente como Master System. Só extraímos uma ROM de console quando o
  // usuário escolhe explicitamente esse console e o arquivo interno é único.
  const isZip = lower.endsWith('.zip') || isZipBytes;
  const explicitNonArcade = Boolean(options?.consoleOverride && !isArcadeConsoleId(options.consoleOverride));

  if (isZip && explicitNonArcade) {
    try {
      const zip = await JSZip.loadAsync(bytes);
      const entries = Object.values(zip.files).filter((f) => !f.dir && !f.name.toLowerCase().endsWith('.zip'));
      const requested = getConsoleSpecById(options!.consoleOverride!);
      const candidates = entries.filter((entry) => requested.extensions.some((ext) => entry.name.toLowerCase().endsWith(ext)));
      if (candidates.length !== 1) {
        throw new Error(`ZIP de ${requested.shortName} precisa conter uma única ROM ${requested.extensions.join(' ou ')}. Para jogos Arcade, selecione um núcleo Arcade.`);
      }
      const entry = candidates[0];
      const extracted = new Uint8Array(await entry.async('arraybuffer'));
      if (extracted.length >= 16) {
        effectiveName = entry.name.split('/').pop() || entry.name;
        effectiveBytes = extracted;
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('ZIP de ')) throw err;
      throw new Error('Não foi possível ler este ZIP. Para Arcade, mantenha o pacote ZIP original e escolha um núcleo Arcade.');
    }
  }

  const detectedSpec = options?.consoleOverride
    ? getConsoleSpecById(options.consoleOverride)
    : detectConsoleFromExtension(effectiveName);

  if (!detectedSpec) {
    throw new Error(
      'Extensão de ROM não reconhecida. Selecione manualmente o núcleo desejado na lista acima ou confira as extensões na aba Núcleos & ROMs.'
    );
  }

  // Remove cabeçalho copier de 512 bytes em ROMs Master System / Game Gear quando presente
  if (
    (detectedSpec.id === 'mastersystem' || detectedSpec.id === 'gamegear' || detectedSpec.id === 'sg1000') &&
    effectiveBytes.length > 512 &&
    effectiveBytes.length % 16384 === 512
  ) {
    effectiveBytes = effectiveBytes.subarray(512);
  }

  const selectedWebCore =
    options?.coreOverride && detectedSpec.altWebCores.includes(options.coreOverride)
      ? options.coreOverride
      : detectedSpec.webCore;

  const usesJsNesDirect = detectedSpec.id === 'nes' && selectedWebCore === 'jsnes';

  if (detectedSpec.id === 'nes') {
    if (effectiveBytes[0] !== 0x4e || effectiveBytes[1] !== 0x45 || effectiveBytes[2] !== 0x53 || effectiveBytes[3] !== 0x1a) {
      throw new Error('Arquivo .nes inválido: cabeçalho iNES ausente.');
    }
  }

  const detectedRegion = detectRomRegion(effectiveName, effectiveBytes, detectedSpec.id);
  const region = options?.regionOverride || detectedRegion.region;
  const tvSystem = region === 'EUR' ? 'PAL' : detectedRegion.tvSystem;

  const sha256 = await computeSha256(effectiveBytes);
  const crc32 = computeCrc32(effectiveBytes);
  const binaryString = usesJsNesDirect ? uint8ToBinaryString(effectiveBytes) : '';

  const extMatch = /\.[^.]+$/.exec(effectiveName);
  const ext = extMatch ? extMatch[0] : '';
  const safeName =
    effectiveName.length > 140
      ? `${effectiveName.slice(0, 140 - ext.length)}${ext}`
      : effectiveName;

  return {
    name: safeName,
    consoleId: detectedSpec.id,
    consoleName: detectedSpec.shortName,
    webCore: selectedWebCore,
    usesJsNesDirect,
    size: effectiveBytes.length,
    sha256,
    crc32,
    region,
    regionLabel: REGION_LABELS[region],
    tvSystem,
    bytes: effectiveBytes,
    binaryString,
  };
}

export function validateRomMatch(
  hostHash: string,
  hostRegion: RomRegion,
  guestRom: ParsedRom | null
): RomMatchResult {
  if (!guestRom) {
    return {
      ok: false,
      reason: 'HASH_MISMATCH',
      message: 'Carregue uma ROM no console antes de entrar na sala.',
    };
  }

  if (guestRom.region !== hostRegion) {
    return {
      ok: false,
      reason: 'REGION_MISMATCH',
      message: `Região incompatível! A sala exige ROM ${REGION_LABELS[hostRegion]}, mas sua ROM é ${REGION_LABELS[guestRom.region]}. ROM do Japão só entra com Japão, e ROM dos Estados Unidos só entra com Estados Unidos.`,
    };
  }

  if (guestRom.sha256 !== hostHash) {
    return {
      ok: false,
      reason: 'HASH_MISMATCH',
      message: `ROM diferente! Mesmo sendo da região ${REGION_LABELS[guestRom.region]}, o arquivo da sua ROM (SHA-256 ${guestRom.sha256.slice(0, 10)}...) não é idêntico ao do Host P1 (${hostHash.slice(0, 10)}...).`,
    };
  }

  return {
    ok: true,
    message: `ROM e Região verificadas (${REGION_LABELS[guestRom.region]} · SHA-256 idêntico).`,
  };
}
