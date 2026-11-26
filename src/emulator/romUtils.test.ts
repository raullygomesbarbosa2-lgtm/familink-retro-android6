import { describe, expect, test } from 'bun:test';
import JSZip from 'jszip';
import { parseRomFile } from './romUtils';

const payload = Uint8Array.from({ length: 64 }, (_, i) => i & 0xff);

async function zipWith(entries: Record<string, Uint8Array>): Promise<Uint8Array> {
  const archive = new JSZip();
  for (const [name, bytes] of Object.entries(entries)) archive.file(name, bytes);
  return new Uint8Array(await archive.generateAsync({ type: 'uint8array' }));
}

describe('ZIP arcade versus ROM de console', () => {
  test('extracts a single Master System ROM from a user-supplied ZIP', async () => {
    const bytes = await zipWith({ 'Streets of Rage II (Europe).sms': payload });
    const parsed = await parseRomFile('Streets of Rage II (Europe).zip', bytes);
    expect(parsed.consoleId).toBe('mastersystem');
    expect(parsed.name).toBe('Streets of Rage II (Europe).sms');
    expect(parsed.bytes).toEqual(payload);
  });

  test('does not mistake a multi-file Arcade ZIP for Master System when one part ends in .sms', async () => {
    const bytes = await zipWith({
      'sor2.sms': payload,
      'chip1.bin': payload,
      'chip2.bin': payload,
    });
    const parsed = await parseRomFile('sor2.zip', bytes);
    expect(parsed.consoleId).toBe('arcade');
    expect(parsed.name).toBe('sor2.zip');
    expect(parsed.bytes).toEqual(bytes);
  });

  test('honors an explicitly selected Arcade core and preserves the ZIP', async () => {
    const bytes = await zipWith({ 'game.sms': payload, 'chip.bin': payload });
    const parsed = await parseRomFile('game.zip', bytes, { consoleOverride: 'arcade' });
    expect(parsed.consoleId).toBe('arcade');
    expect(parsed.bytes).toEqual(bytes);
  });
});
