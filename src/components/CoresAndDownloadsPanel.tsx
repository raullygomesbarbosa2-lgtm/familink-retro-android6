import React, { useState } from 'react';
import { ExternalLink, Cpu, Download, ShieldCheck, Search, ChevronDown, ChevronUp } from 'lucide-react';
import {
  CLASSIC_CONSOLE_CORES,
  TOTAL_WEB_CORE_COUNT,
  type ManufacturerName,
} from '../emulator/coreRegistry';

export const CoresAndDownloadsPanel: React.FC = () => {
  const [makerFilter, setMakerFilter] = useState<'Todos' | ManufacturerName>('Todos');
  const [search, setSearch] = useState('');
  const [expandedCore, setExpandedCore] = useState<string | null>(null);

  const makers: Array<'Todos' | ManufacturerName> = [
    'Todos', 'Nintendo', 'Sega', 'NEC', 'SNK / Arcade', 'Atari', 'Bandai / Clássicos', 'Computadores',
  ];
  const q = search.trim().toLowerCase();
  const filtered = CLASSIC_CONSOLE_CORES.filter((c) => {
    if (makerFilter !== 'Todos' && c.manufacturer !== makerFilter) return false;
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.shortName.toLowerCase().includes(q) ||
      c.altWebCores.some((w) => w.toLowerCase().includes(q)) || c.extensions.some((ext) => ext.toLowerCase().includes(q));
  });

  return (
    <div className="max-w-6xl mx-auto space-y-3 sm:space-y-6">
      <div className="space-y-2 sm:flex sm:flex-wrap sm:items-end sm:justify-between sm:gap-4 sm:space-y-0">
        <div>
          <h2 className="text-lg sm:text-2xl font-display font-bold text-white">
            Núcleos &amp; ROMs <span className="text-xs sm:text-base text-gray-400">· {CLASSIC_CONSOLE_CORES.length} sistemas / {TOTAL_WEB_CORE_COUNT} núcleos</span>
          </h2>
          <p className="hidden sm:block text-sm text-gray-400 mt-1">
            Procure um console para ver seus núcleos, extensões e links de ROMs. Sistemas Sony não são incluídos.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar console ou núcleo..."
            className="w-full bg-[#12161F] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 sm:py-2 text-sm sm:text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E11D48]"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap p-1 bg-[#12161F] border border-white/10 rounded-lg [scrollbar-width:none]">
        {makers.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMakerFilter(m)}
            className={`px-3 py-2 sm:py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer ${makerFilter === m ? 'bg-[#E11D48] text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-400 px-1">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{filtered.length} de {CLASSIC_CONSOLE_CORES.length} sistemas. Toque num console para ver os códigos e downloads.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-5">
        {filtered.map((core) => {
          const isExpanded = expandedCore === core.id;
          return (
            <section key={core.id} className="bg-[#12161F] border border-white/10 rounded-lg sm:rounded-xl overflow-hidden">
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => setExpandedCore(isExpanded ? null : core.id)}
                className="w-full text-left px-3 py-3 sm:p-5 flex items-center gap-3 cursor-pointer hover:bg-white/[0.03]"
              >
                <Cpu className="w-4 h-4 text-[#E11D48] shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] sm:text-xs text-gray-400 truncate">{core.manufacturer} · {core.year}</span>
                  <span className="block text-sm sm:text-base font-semibold text-white truncate">{core.shortName}</span>
                  <span className="block text-[10px] sm:text-xs text-emerald-300 font-mono truncate">
                    Núcleo: {core.webCore} · ROM: {core.extensions.join(', ')}
                  </span>
                </span>
                <span className="text-gray-400 shrink-0" aria-hidden="true">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 sm:px-5 sm:pb-5 space-y-2.5 border-t border-white/10 pt-3">
                  <div className="text-[11px] sm:text-xs text-gray-300 font-mono break-words">
                    <div>Extensões: {core.extensions.join(', ')}</div>
                    <div className="text-emerald-300 mt-1">Núcleos Web: {core.altWebCores.join(', ')}</div>
                    <div className="text-gray-400 mt-1 break-all">Núcleo Android (.so): {core.androidCoreSo}</div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="text-[11px] font-semibold text-gray-300">Acesso para baixar ROMs</div>
                    {core.romSources.map((src) => (
                      <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer"
                        className="block p-2.5 rounded-lg bg-[#0F131C] hover:bg-[#181D29] border border-white/10">
                        <span className="flex items-center justify-between gap-2 text-xs font-semibold text-white">
                          <span>{src.label}</span><ExternalLink className="w-3.5 h-3.5 text-[#E11D48] shrink-0" />
                        </span>
                        <span className="block text-[11px] text-gray-400 mt-1">{src.description}</span>
                      </a>
                    ))}
                    <a href={core.androidCoreDownloadUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-xs font-medium text-emerald-300">
                      <span>Baixar núcleo Android (.so arm64)</span><Download className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
