import React, { useState } from 'react';
import { ExternalLink, Cpu, Download, ShieldCheck, Search } from 'lucide-react';
import {
  CLASSIC_CONSOLE_CORES,
  TOTAL_WEB_CORE_COUNT,
  type ManufacturerName,
} from '../emulator/coreRegistry';

export const CoresAndDownloadsPanel: React.FC = () => {
  const [makerFilter, setMakerFilter] = useState<'Todos' | ManufacturerName>('Todos');
  const [search, setSearch] = useState('');

  const makers: Array<'Todos' | ManufacturerName> = [
    'Todos',
    'Nintendo',
    'Sega',
    'NEC',
    'SNK / Arcade',
    'Atari',
    'Bandai / Clássicos',
    'Computadores',
  ];

  const q = search.trim().toLowerCase();
  const filtered = CLASSIC_CONSOLE_CORES.filter((c) => {
    if (makerFilter !== 'Todos' && c.manufacturer !== makerFilter) return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q) ||
      c.altWebCores.some((w) => w.toLowerCase().includes(q)) ||
      c.extensions.some((ext) => ext.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">
            {CLASSIC_CONSOLE_CORES.length} Consoles Clássicos &amp; {TOTAL_WEB_CORE_COUNT} Núcleos (Sem Sony)
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Coleção massiva de núcleos clássicos antigos rodando em Canvas nativo (Web) e JNI C++ (Android SDK sem WebView), com links diretos para baixar ROMs e núcleos .so.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar console, núcleo ou .ext..."
            className="w-full bg-[#12161F] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E11D48]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#12161F] border border-white/10 rounded-lg">
        {makers.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMakerFilter(m)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              makerFilter === m
                ? 'bg-[#E11D48] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="bg-[#12161F] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Consoles Sony (PlayStation 1, PS2, PSP e Vita) são intencionalmente bloqueados. Todos os consoles antigos abaixo incluem múltiplos motores WebAssembly e binários Android .so.
          </span>
        </div>
        <span className="font-mono text-gray-400">
          Exibindo {filtered.length} de {CLASSIC_CONSOLE_CORES.length} sistemas
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((core) => (
          <div
            key={core.id}
            className="bg-[#12161F] border border-white/10 rounded-xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-gray-400">
                    {core.manufacturer} · {core.year}
                  </div>
                  <h3 className="text-base font-semibold text-white mt-0.5">{core.shortName}</h3>
                </div>
                <Cpu className="w-4 h-4 text-[#E11D48] shrink-0 mt-1" />
              </div>

              <div className="text-xs text-gray-400 space-y-1 font-mono">
                <div>Extensões: {core.extensions.join(', ')}</div>
                <div className="text-emerald-300">
                  Núcleos Web: {core.altWebCores.join(', ')}
                </div>
                <div className="truncate" title={core.androidCoreSo}>
                  Android .so: {core.androidCoreSo}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="text-[11px] font-semibold text-gray-300">
                Acesso para Baixar ROMs ({core.shortName})
              </div>
              {core.romSources.map((src) => (
                <a
                  key={src.url}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2.5 rounded-lg bg-[#0F131C] hover:bg-[#181D29] border border-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white">
                    <span>{src.label}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#E11D48] shrink-0" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{src.description}</p>
                </a>
              ))}

              <a
                href={core.androidCoreDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-xs font-medium text-emerald-300 transition-colors"
              >
                <span>Baixar Núcleo Android (.so arm64)</span>
                <Download className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
