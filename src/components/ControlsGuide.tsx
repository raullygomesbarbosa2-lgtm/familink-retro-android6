import React, { useEffect, useState } from 'react';
import { Bluetooth, Gamepad2, Keyboard, Vibrate, RefreshCw } from 'lucide-react';
import {
  listConnectedGamepads,
  requestBluetoothGamepadAccess,
  triggerGamepadRumble,
  type BluetoothGamepadConfig,
  type DetectedBluetoothGamepad,
} from '../emulator/inputManager';

interface ControlsGuideProps {
  btConfig: BluetoothGamepadConfig;
  onChangeBtConfig: (next: BluetoothGamepadConfig) => void;
}

export const ControlsGuide: React.FC<ControlsGuideProps> = ({ btConfig, onChangeBtConfig }) => {
  const [pads, setPads] = useState<DetectedBluetoothGamepad[]>([]);
  const [btFeedback, setBtFeedback] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);

  useEffect(() => {
    const refresh = () => setPads(listConnectedGamepads());
    refresh();
    const id = window.setInterval(refresh, 100);
    window.addEventListener('gamepadconnected', refresh);
    window.addEventListener('gamepaddisconnected', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('gamepadconnected', refresh);
      window.removeEventListener('gamepaddisconnected', refresh);
    };
  }, []);

  const handlePairBluetooth = async () => {
    setPairing(true);
    try {
      const res = await requestBluetoothGamepadAccess();
      setBtFeedback(res.message);
    } finally {
      setPairing(false);
    }
  };

  const p1Bindings = [
    { action: 'Direcional (D-Pad)', keys: 'Setas ou W A S D' },
    { action: '○ Círculo (A)', keys: 'X ou K' },
    { action: '✕ Cruz (B)', keys: 'Z ou J' },
    { action: '△ Triângulo (X)', keys: 'C' },
    { action: '□ Quadrado (Y)', keys: 'V' },
    { action: 'L1 / R1 / L2 / R2', keys: 'Q / E / 1 / 2' },
    { action: 'Start / Select', keys: 'Enter / Shift' },
  ];

  const p2Bindings = [
    { action: 'Direcional (D-Pad)', keys: 'I (Cima) J (Esq) K (Baixo) L (Dir)' },
    { action: '○ Círculo (A) / ✕ Cruz (B)', keys: 'M / N' },
    { action: '△ Triângulo (X) / □ Quadrado (Y)', keys: 'U / H' },
    { action: 'Start / Select', keys: 'P / O' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white">
            Controles Bluetooth Universais &amp; Mapeamento PlayStation
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Compatível com qualquer controle Bluetooth (PS5 DualSense, PS4 DualShock, Xbox, Switch Pro, 8BitDo, Ípega, GameSir e genéricos) e já ativo automaticamente.
          </p>
        </div>

        <button
          type="button"
          disabled={pairing}
          onClick={() => void handlePairBluetooth()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <Bluetooth className="w-4 h-4" />
          <span>{pairing ? 'Procurando Bluetooth...' : 'Conectar Controle Bluetooth'}</span>
        </button>
      </div>

      {btFeedback && (
        <div className="p-3.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200">
          {btFeedback}
        </div>
      )}

      {/* Universal Bluetooth Gamepad Hub */}
      <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">
              Controles Bluetooth / USB Conectados ({pads.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Detecção automática a 60Hz
          </span>
        </div>

        {/* Universal Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#0F131C] border border-white/10 text-xs">
          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <span className="text-gray-300">Inverter ✕ / ○ (Modo Xbox)</span>
            <input
              type="checkbox"
              checked={btConfig.swapFaceButtons}
              onChange={(e) =>
                onChangeBtConfig({ ...btConfig, swapFaceButtons: e.target.checked })
              }
              className="accent-[#E11D48] w-4 h-4"
            />
          </label>

          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-300">Deadzone Analógico</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0.15}
                max={0.65}
                step={0.05}
                value={btConfig.deadzone}
                onChange={(e) =>
                  onChangeBtConfig({ ...btConfig, deadzone: Number(e.target.value) })
                }
                className="accent-[#E11D48] w-20"
              />
              <span className="font-mono text-white w-8 text-right">
                {Math.round(btConfig.deadzone * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-300">Porta P1</span>
            <select
              value={btConfig.p1PadIndex}
              onChange={(e) =>
                onChangeBtConfig({ ...btConfig, p1PadIndex: Number(e.target.value) })
              }
              className="bg-[#181D29] border border-white/10 rounded px-2 py-1 text-xs text-white"
            >
              <option value={-1}>Automático (#1)</option>
              {pads.map((p) => (
                <option key={p.index} value={p.index}>
                  Controle #{p.index + 1}
                </option>
              ))}
            </select>
          </div>
        </div>

        {pads.length === 0 ? (
          <div className="p-4 rounded-lg bg-[#0F131C] border border-dashed border-white/15 text-xs text-gray-400 space-y-1">
            <p className="text-gray-200 font-medium">
              Nenhum controle Bluetooth detectado ainda — pressione qualquer botão no seu controle!
            </p>
            <p>
              Assim que você parear seu DualShock 4, DualSense PS5, Xbox, Switch Pro, 8BitDo, Ípega ou controle Bluetooth genérico e apertar ✕, ○ ou Start, ele aparece aqui e já funciona na hora sem precisar configurar.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pads.map((pad) => (
              <div
                key={pad.index}
                className="p-3.5 rounded-lg bg-[#0F131C] border border-emerald-500/25 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">Porta #{pad.index + 1}</span>
                    <span className="text-emerald-400 font-medium">{pad.brandHint}</span>
                    <span className="text-[11px] font-mono text-gray-400">({pad.mapping})</span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono truncate max-w-xl">
                    {pad.id} · {pad.buttonsCount} botões · {pad.axesCount} eixos
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-emerald-400 tabular-nums">
                    {pad.pressedIndices.length > 0
                      ? `Botões: ${pad.pressedIndices.join(', ')}`
                      : 'Ativo'}
                  </span>
                  {pad.hasRumble && (
                    <button
                      type="button"
                      onClick={() => void triggerGamepadRumble(pad.index)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-[11px] text-gray-200 cursor-pointer"
                    >
                      <Vibrate className="w-3.5 h-3.5 text-sky-400" />
                      <span>Testar Vibração</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard Bindings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-[#E11D48]" />
            <h3 className="text-sm font-semibold text-white">Teclado Jogador 1 (Layout PlayStation)</h3>
          </div>
          <div className="divide-y divide-white/10 text-xs">
            {p1Bindings.map((b) => (
              <div key={b.action} className="py-2 flex items-center justify-between gap-4">
                <span className="text-gray-300">{b.action}</span>
                <span className="font-mono text-white bg-[#181D29] px-2 py-0.5 rounded border border-white/10">
                  {b.keys}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Teclado Jogador 2 (Local 2P Mesmo PC)</h3>
          </div>
          <div className="divide-y divide-white/10 text-xs">
            {p2Bindings.map((b) => (
              <div key={b.action} className="py-2 flex items-center justify-between gap-4">
                <span className="text-gray-300">{b.action}</span>
                <span className="font-mono text-white bg-[#181D29] px-2 py-0.5 rounded border border-white/10">
                  {b.keys}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
