import React, { useRef, useState } from 'react';
import { Upload, Users, User, Cpu, ExternalLink, Trash2 } from 'lucide-react';
import {
  ALL_SUPPORTED_EXTENSIONS,
  CLASSIC_CONSOLE_CORES,
  TOTAL_WEB_CORE_COUNT,
  getConsoleSpecById,
  type ConsoleId,
} from '../emulator/coreRegistry';
import { parseRomFile, type ParsedRom, type RomRegion } from '../emulator/romUtils';
import type { BiosFileItem, PlayMode } from './EmulatorViewport';

interface RomLibraryPanelProps {
  activeRom: ParsedRom | null;
  biosFiles: BiosFileItem[];
  playMode: PlayMode;
  inNetplayRoom: boolean;
  onSelectRom: (rom: ParsedRom | null) => void;
  onAddBiosFiles: (files: BiosFileItem[]) => void;
  onClearBiosFiles: () => void;
  onSelectLocalMode: (mode: 'solo' | 'couch-2p') => void;
  onOpenCoresTab: () => void;
}

export const RomLibraryPanel: React.FC<RomLibraryPanelProps> = ({
  activeRom,
  biosFiles,
  playMode,
  inNetplayRoom,
  onSelectRom,
  onAddBiosFiles,
  onClearBiosFiles,
  onSelectLocalMode,
  onOpenCoresTab,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const biosInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pendingRegion, setPendingRegion] = useState<RomRegion | 'AUTO'>('AUTO');
  const [pendingConsole, setPendingConsole] = useState<ConsoleId | 'AUTO'>('AUTO');
  const [pendingCoreEngine, setPendingCoreEngine] = useState<string>('AUTO');

  const selectedConsoleSpec =
    pendingConsole !== 'AUTO' ? getConsoleSpecById(pendingConsole) : null;

  const handleFile = async (file: File) => {
    setUploadError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const parsed = await parseRomFile(file.name, bytes, {
        regionOverride: pendingRegion === 'AUTO' ? undefined : pendingRegion,
        consoleOverride: pendingConsole === 'AUTO' ? undefined : pendingConsole,
        coreOverride: pendingCoreEngine === 'AUTO' ? undefined : pendingCoreEngine,
      });
      onSelectRom(parsed);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao ler arquivo ROM.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Local Mode Selector (Solo vs Local 2P Couch) */}
      {!inNetplayRoom && (
        <div className="bg-[#12161F] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-gray-300">Modo de Jogo Local</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSelectLocalMode('solo')}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                playMode === 'solo'
                  ? 'bg-[#E11D48] border-[#E11D48] text-white'
                  : 'bg-[#181D29] border-white/10 text-gray-300 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Solo (1P)</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectLocalMode('couch-2p')}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                playMode === 'couch-2p'
                  ? 'bg-[#E11D48] border-[#E11D48] text-white'
                  : 'bg-[#181D29] border-white/10 text-gray-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Local 2P</span>
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {playMode === 'couch-2p'
              ? 'P1 usa Controle PS na tela / Bluetooth #1 / Setas. P2 usa Bluetooth #2 ou I/J/K/L + N/M.'
              : 'Controle PlayStation na tela e qualquer Controle Bluetooth já funcionam automaticamente.'}
          </p>
        </div>
      )}

      {/* Multi-Console ROM Upload (Zero Example Games) */}
      <div className="bg-[#12161F] border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Inserir ROM do Dispositivo</h3>
          {activeRom && !inNetplayRoom && (
            <button
              type="button"
              onClick={() => onSelectRom(null)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Ejetar</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={pendingConsole}
            onChange={(e) => {
              setPendingConsole(e.target.value as ConsoleId | 'AUTO');
              setPendingCoreEngine('AUTO');
            }}
            disabled={inNetplayRoom}
            aria-label="Console clássico"
            className="bg-[#181D29] border border-white/10 rounded-md px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#E11D48]"
          >
            <option value="AUTO">Console: Auto-Detectar ({CLASSIC_CONSOLE_CORES.length})</option>
            {CLASSIC_CONSOLE_CORES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shortName} ({c.year})
              </option>
            ))}
          </select>

          <select
            value={pendingRegion}
            onChange={(e) => setPendingRegion(e.target.value as RomRegion | 'AUTO')}
            disabled={inNetplayRoom}
            aria-label="Detecção de região da ROM"
            className="bg-[#181D29] border border-white/10 rounded-md px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#E11D48]"
          >
            <option value="AUTO">Região: Auto-Detectar</option>
            <option value="USA">EUA (NTSC-U)</option>
            <option value="JPN">Japão (NTSC-J)</option>
            <option value="EUR">Europa (PAL)</option>
          </select>
        </div>

        {selectedConsoleSpec && selectedConsoleSpec.altWebCores.length > 1 && (
          <select
            value={pendingCoreEngine}
            onChange={(e) => setPendingCoreEngine(e.target.value)}
            disabled={inNetplayRoom}
            aria-label="Motor de emulação"
            className="w-full bg-[#181D29] border border-white/10 rounded-md px-2 py-1.5 text-xs text-emerald-300 focus:outline-none focus:border-[#E11D48]"
          >
            <option value="AUTO">Núcleo Padrão: {selectedConsoleSpec.webCore}</option>
            {selectedConsoleSpec.altWebCores.map((coreName) => (
              <option key={coreName} value={coreName}>
                Usar núcleo: {coreName}
              </option>
            ))}
          </select>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!inNetplayRoom) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (inNetplayRoom) return;
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          onClick={() => {
            if (!inNetplayRoom) fileInputRef.current?.click();
          }}
          className={`border border-dashed rounded-lg p-5 text-center transition-colors ${
            inNetplayRoom
              ? 'border-white/10 opacity-50 cursor-not-allowed'
              : dragActive
                ? 'border-[#E11D48] bg-[#E11D48]/10 cursor-pointer'
                : 'border-white/20 hover:border-white/35 bg-[#0F131C] cursor-pointer'
          }`}
        >
          <Upload className="w-5 h-5 text-gray-400 mx-auto mb-2" />
          <p className="text-xs font-medium text-gray-200">
            {inNetplayRoom
              ? 'Saia da sala para trocar de ROM'
              : 'Clique ou arraste sua ROM aqui'}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {CLASSIC_CONSOLE_CORES.length} sistemas clássicos ({TOTAL_WEB_CORE_COUNT} núcleos verificados sem Sony): Nintendo, Sega, NEC, Atari Lynx, Neo Geo, Arcade, C64, PICO-8, Doom e mais.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALL_SUPPORTED_EXTENSIONS}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
        </div>

        {uploadError && (
          <p className="text-xs text-[#FB7185] bg-[#E11D48]/10 border border-[#E11D48]/30 rounded-lg p-2.5">
            {uploadError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => biosInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F131C] hover:bg-[#181D29] border border-white/10 text-[11px] font-medium text-gray-300 cursor-pointer"
          >
            <Upload className="w-3 h-3 text-amber-400" />
            <span>
              {biosFiles.length > 0
                ? `BIOS anexadas (${biosFiles.map((b) => b.name).join(', ')})`
                : 'Anexar BIOS Opcional (ex: neogeo.zip)'}
            </span>
          </button>
          {biosFiles.length > 0 && (
            <button
              type="button"
              onClick={onClearBiosFiles}
              className="px-2 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-[11px] text-gray-400 hover:text-white cursor-pointer"
            >
              Limpar
            </button>
          )}
          <input
            ref={biosInputRef}
            type="file"
            multiple
            accept=".zip,.bin,.rom"
            className="hidden"
            onChange={async (e) => {
              const list = Array.from(e.target.files || []);
              if (list.length > 0) {
                const loaded: BiosFileItem[] = await Promise.all(
                  list.map(async (f) => ({
                    name: f.name,
                    bytes: new Uint8Array(await f.arrayBuffer()),
                  }))
                );
                onAddBiosFiles(loaded);
              }
              e.target.value = '';
            }}
          />
        </div>

        <button
          type="button"
          onClick={onOpenCoresTab}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-xs font-medium text-gray-200 transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#E11D48]" />
          <span>Explorar {CLASSIC_CONSOLE_CORES.length} Consoles &amp; Baixar ROMs</span>
        </button>
      </div>

      {/* Active ROM Verification Details */}
      {activeRom ? (
        <div className="bg-[#12161F] border border-white/10 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-white">Assinatura da ROM Carregada</h3>
          </div>
          <div className="space-y-1.5 text-xs font-mono tabular-nums">
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">Console:</span>
              <span className="text-white font-semibold">{activeRom.consoleName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">Núcleo:</span>
              <span className="text-emerald-300">{activeRom.webCore}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">Região:</span>
              <span className={activeRom.region === 'JPN' ? 'text-amber-400 font-semibold' : 'text-sky-400 font-semibold'}>
                {activeRom.regionLabel}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">CRC32:</span>
              <span className="text-gray-200">{activeRom.crc32}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">Tamanho:</span>
              <span className="text-gray-200">{(activeRom.size / 1024).toFixed(1)} KB</span>
            </div>
            <div className="pt-1 border-t border-white/10">
              <span className="text-gray-400 block mb-0.5">SHA-256:</span>
              <span className="text-[11px] text-emerald-400 break-all">{activeRom.sha256}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#12161F] border border-white/10 rounded-xl p-4 text-xs text-gray-400 space-y-1">
          <div className="font-semibold text-gray-200">Sem jogos de exemplo pré-carregados</div>
          <p>
            Envie qualquer ROM clássica acima ou acesse <strong className="text-white">Núcleos &amp; ROMs</strong> para baixar jogos gratuitos de todos os consoles clássicos.
          </p>
        </div>
      )}
    </div>
  );
};
