import React, { useRef, useState, useCallback } from 'react';
import { Bluetooth } from 'lucide-react';
import type { DetectedBluetoothGamepad } from '../emulator/inputManager';

interface PlayStationControllerProps {
  activeMask: number;
  disabled?: boolean;
  connectedPads: DetectedBluetoothGamepad[];
  onTouchMaskChange: (mask: number) => void;
  onOpenBluetoothModal: () => void;
}

export const PlayStationController: React.FC<PlayStationControllerProps> = ({
  activeMask,
  disabled = false,
  connectedPads,
  onTouchMaskChange,
  onOpenBluetoothModal,
}) => {
  const [leftStickOffset, setLeftStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rightStickOffset, setRightStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const leftStickBaseRef = useRef<HTMLDivElement | null>(null);
  const rightStickBaseRef = useRef<HTMLDivElement | null>(null);
  const leftStickPointerRef = useRef<number | null>(null);
  const rightStickPointerRef = useRef<number | null>(null);
  const rightMovedRef = useRef(false);

  // Separate input bitmask layers so D-Pad + Left Stick + Right Stick + Face Buttons never overwrite each other
  const buttonsMaskRef = useRef(0);
  const dpadMaskRef = useRef(0);
  const leftStickMaskRef = useRef(0);
  const rightStickMaskRef = useRef(0);

  const emitMask = useCallback(() => {
    const combined =
      buttonsMaskRef.current |
      dpadMaskRef.current |
      leftStickMaskRef.current |
      rightStickMaskRef.current;
    onTouchMaskChange(combined);
  }, [onTouchMaskChange]);

  const isDown = (bit: number) => Boolean(activeMask & (1 << bit));

  const setLayerBit = (layerRef: React.MutableRefObject<number>, bit: number, down: boolean) => {
    if (down) {
      layerRef.current |= 1 << bit;
    } else {
      layerRef.current &= ~(1 << bit);
    }
    emitMask();
  };

  const bindBtn = (bit: number, isDpad = false) => {
    const layer = isDpad ? dpadMaskRef : buttonsMaskRef;
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        if (disabled) return;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setLayerBit(layer, bit, true);
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.preventDefault();
        setLayerBit(layer, bit, false);
      },
      onPointerCancel: () => setLayerBit(layer, bit, false),
    };
  };

  const updateLeftStick = (clientX: number, clientY: number) => {
    const el = leftStickBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.max(18, rect.width * 0.34);
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const ny = dist > 0 ? Math.sin(angle) * clampedDist : 0;

    setLeftStickOffset({ x: nx, y: ny });

    const normX = nx / maxR;
    const normY = ny / maxR;
    let stickBits = 0;
    if (normY < -0.32) stickBits |= 1 << 4; // Up
    if (normY > 0.32) stickBits |= 1 << 5;  // Down
    if (normX < -0.32) stickBits |= 1 << 6; // Left
    if (normX > 0.32) stickBits |= 1 << 7;  // Right
    leftStickMaskRef.current = stickBits;
    emitMask();
  };

  const releaseLeftStick = () => {
    leftStickPointerRef.current = null;
    setLeftStickOffset({ x: 0, y: 0 });
    leftStickMaskRef.current = 0;
    emitMask();
  };

  const updateRightStick = (clientX: number, clientY: number) => {
    const el = rightStickBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.max(18, rect.width * 0.34);
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      rightMovedRef.current = true;
    }
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const ny = dist > 0 ? Math.sin(angle) * clampedDist : 0;

    setRightStickOffset({ x: nx, y: ny });

    const normX = nx / maxR;
    const normY = ny / maxR;
    let stickBits = 0;
    if (normY < -0.38) stickBits |= 1 << 8; // △
    if (normY > 0.38) stickBits |= 1 << 1;  // ✕
    if (normX < -0.38) stickBits |= 1 << 9; // □
    if (normX > 0.38) stickBits |= 1 << 0;  // ○
    rightStickMaskRef.current = stickBits;
    emitMask();
  };

  const releaseRightStick = () => {
    rightStickPointerRef.current = null;
    setRightStickOffset({ x: 0, y: 0 });
    rightStickMaskRef.current = 0;
    setLayerBit(buttonsMaskRef, 15, false);
  };

  return (
    <div
      className={`w-full bg-gradient-to-b from-[#171B26] via-[#12161F] to-[#0B0E14] border-t border-white/15 px-3 sm:px-6 py-3.5 select-none touch-none ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* Shoulder Triggers Row (L2 / L1 — Bluetooth Bar — R1 / R2) */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            {...bindBtn(12)}
            className={`px-3.5 sm:px-6 py-1.5 rounded-t-xl rounded-b-md border text-[11px] font-bold tracking-wider transition-transform active:scale-95 ${
              isDown(12)
                ? 'bg-[#E11D48] border-[#FB7185] text-white shadow-[0_0_12px_rgba(225,29,72,0.5)]'
                : 'bg-[#1D2230] border-white/15 text-gray-200 hover:bg-[#262D3F]'
            }`}
          >
            L2
          </button>
          <button
            type="button"
            {...bindBtn(10)}
            className={`px-4 sm:px-7 py-1.5 rounded-t-xl rounded-b-md border text-[11px] font-bold tracking-wider transition-transform active:scale-95 ${
              isDown(10)
                ? 'bg-[#E11D48] border-[#FB7185] text-white shadow-[0_0_12px_rgba(225,29,72,0.5)]'
                : 'bg-[#1D2230] border-white/15 text-gray-200 hover:bg-[#262D3F]'
            }`}
          >
            L1
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenBluetoothModal}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
            connectedPads.length > 0
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-[#181D29] border-white/15 text-sky-300 hover:bg-[#22293A]'
          }`}
        >
          <Bluetooth className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[130px] sm:max-w-[260px]">
            {connectedPads.length > 0
              ? `${connectedPads.length} Controle(s) BT`
              : 'Bluetooth / Teclas'}
          </span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            {...bindBtn(11)}
            className={`px-4 sm:px-7 py-1.5 rounded-t-xl rounded-b-md border text-[11px] font-bold tracking-wider transition-transform active:scale-95 ${
              isDown(11)
                ? 'bg-[#E11D48] border-[#FB7185] text-white shadow-[0_0_12px_rgba(225,29,72,0.5)]'
                : 'bg-[#1D2230] border-white/15 text-gray-200 hover:bg-[#262D3F]'
            }`}
          >
            R1
          </button>
          <button
            type="button"
            {...bindBtn(13)}
            className={`px-3.5 sm:px-6 py-1.5 rounded-t-xl rounded-b-md border text-[11px] font-bold tracking-wider transition-transform active:scale-95 ${
              isDown(13)
                ? 'bg-[#E11D48] border-[#FB7185] text-white shadow-[0_0_12px_rgba(225,29,72,0.5)]'
                : 'bg-[#1D2230] border-white/15 text-gray-200 hover:bg-[#262D3F]'
            }`}
          >
            R2
          </button>
        </div>
      </div>

      {/* Main Stretched DualShock Layout: D-Pad + Left Stick + Center + Right Stick + Face Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Left Wing: PlayStation D-Pad + Left Analog Stick (ALWAYS VISIBLE) */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="grid grid-cols-3 gap-1 w-[104px] sm:w-[126px]">
              <div />
              <button
                type="button"
                aria-label="D-Pad Cima"
                {...bindBtn(4, true)}
                className={`h-9 sm:h-11 rounded-t-lg border flex items-center justify-center text-xs sm:text-sm font-bold transition-transform active:scale-95 ${
                  isDown(4)
                    ? 'bg-[#38BDF8] border-sky-300 text-slate-950 shadow-[0_0_10px_rgba(56,189,248,0.6)]'
                    : 'bg-[#1E2331] border-white/15 text-gray-200'
                }`}
              >
                ▲
              </button>
              <div />
              <button
                type="button"
                aria-label="D-Pad Esquerda"
                {...bindBtn(6, true)}
                className={`h-9 sm:h-11 rounded-l-lg border flex items-center justify-center text-xs sm:text-sm font-bold transition-transform active:scale-95 ${
                  isDown(6)
                    ? 'bg-[#38BDF8] border-sky-300 text-slate-950 shadow-[0_0_10px_rgba(56,189,248,0.6)]'
                    : 'bg-[#1E2331] border-white/15 text-gray-200'
                }`}
              >
                ◀
              </button>
              <div className="h-9 sm:h-11 bg-[#161A24] border border-white/10 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
              </div>
              <button
                type="button"
                aria-label="D-Pad Direita"
                {...bindBtn(7, true)}
                className={`h-9 sm:h-11 rounded-r-lg border flex items-center justify-center text-xs sm:text-sm font-bold transition-transform active:scale-95 ${
                  isDown(7)
                    ? 'bg-[#38BDF8] border-sky-300 text-slate-950 shadow-[0_0_10px_rgba(56,189,248,0.6)]'
                    : 'bg-[#1E2331] border-white/15 text-gray-200'
                }`}
              >
                ▶
              </button>
              <div />
              <button
                type="button"
                aria-label="D-Pad Baixo"
                {...bindBtn(5, true)}
                className={`h-9 sm:h-11 rounded-b-lg border flex items-center justify-center text-xs sm:text-sm font-bold transition-transform active:scale-95 ${
                  isDown(5)
                    ? 'bg-[#38BDF8] border-sky-300 text-slate-950 shadow-[0_0_10px_rgba(56,189,248,0.6)]'
                    : 'bg-[#1E2331] border-white/15 text-gray-200'
                }`}
              >
                ▼
              </button>
              <div />
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400">D-PAD</span>
          </div>

          {/* Interactive Left Analog Joystick (ALWAYS VISIBLE on Mobile & Desktop) */}
          <div className="flex flex-col items-center gap-1">
            <div
              ref={leftStickBaseRef}
              onPointerDown={(e) => {
                e.preventDefault();
                if (disabled) return;
                leftStickPointerRef.current = e.pointerId;
                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                updateLeftStick(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (leftStickPointerRef.current !== e.pointerId) return;
                updateLeftStick(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                if (leftStickPointerRef.current === e.pointerId) releaseLeftStick();
              }}
              onPointerCancel={() => releaseLeftStick()}
              title="Joystick Analógico Esquerdo (Arraste em 360°)"
              className="flex w-16 h-16 sm:w-[74px] sm:h-[74px] rounded-full bg-[#0D1017] border-2 border-sky-500/35 items-center justify-center relative cursor-grab active:cursor-grabbing shadow-inner"
            >
              <div className="absolute inset-1.5 rounded-full border border-white/5 pointer-events-none" />
              <div
                style={{ transform: `translate(${leftStickOffset.x}px, ${leftStickOffset.y}px)` }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-[#3A435B] to-[#1D2332] border border-white/30 shadow-md flex items-center justify-center text-[10px] font-bold text-gray-200 pointer-events-none"
              >
                L3
              </div>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-sky-300">Analógico L</span>
          </div>
        </div>

        {/* Center PlayStation Bridge: SELECT · PS · START */}
        <div className="flex items-center gap-2 sm:gap-3 mx-auto order-last w-full justify-center sm:order-none sm:w-auto">
          <button
            type="button"
            {...bindBtn(2)}
            className={`px-3.5 py-2 rounded-md border text-[10px] sm:text-xs font-bold tracking-wider transition-transform active:scale-95 ${
              isDown(2)
                ? 'bg-sky-500 border-sky-300 text-slate-950'
                : 'bg-[#1E2331] border-white/15 text-gray-300'
            }`}
          >
            SELECT
          </button>

          <button
            type="button"
            onClick={onOpenBluetoothModal}
            title="Menu PlayStation / Controles Bluetooth"
            className="w-9 h-9 rounded-full bg-[#181D29] hover:bg-[#232A3B] border border-sky-400/40 flex items-center justify-center text-[10px] font-black text-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.2)] cursor-pointer"
          >
            PS
          </button>

          <button
            type="button"
            {...bindBtn(3)}
            className={`px-3.5 py-2 rounded-md border text-[10px] sm:text-xs font-bold tracking-wider transition-transform active:scale-95 ${
              isDown(3)
                ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                : 'bg-[#1E2331] border-white/15 text-gray-300'
            }`}
          >
            START
          </button>
        </div>

        {/* Right Wing: Right Analog Joystick (R3) + PlayStation Face Buttons (△ ○ ✕ □) */}
        <div className="flex items-center gap-2.5 sm:gap-4 ml-auto">
          {/* Interactive Right Analog Joystick (ALWAYS VISIBLE on Mobile & Desktop) */}
          <div className="flex flex-col items-center gap-1">
            <div
              ref={rightStickBaseRef}
              onPointerDown={(e) => {
                e.preventDefault();
                if (disabled) return;
                rightStickPointerRef.current = e.pointerId;
                rightMovedRef.current = false;
                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                setLayerBit(buttonsMaskRef, 15, true);
                updateRightStick(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (rightStickPointerRef.current !== e.pointerId) return;
                updateRightStick(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                if (rightStickPointerRef.current === e.pointerId) releaseRightStick();
              }}
              onPointerCancel={() => releaseRightStick()}
              title="Joystick Analógico Direito (Arraste para ações △ ○ ✕ □ ou toque para R3)"
              className="flex w-16 h-16 sm:w-[74px] sm:h-[74px] rounded-full bg-[#0D1017] border-2 border-[#E11D48]/35 items-center justify-center relative cursor-grab active:cursor-grabbing shadow-inner"
            >
              <div className="absolute inset-1.5 rounded-full border border-white/5 pointer-events-none" />
              <div
                style={{ transform: `translate(${rightStickOffset.x}px, ${rightStickOffset.y}px)` }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border shadow-md flex items-center justify-center text-[10px] font-bold pointer-events-none ${
                  isDown(15)
                    ? 'bg-gradient-to-b from-[#E11D48] to-[#9F1239] border-rose-200 text-white'
                    : 'bg-gradient-to-b from-[#3A435B] to-[#1D2332] border-white/30 text-gray-200'
                }`}
              >
                R3
              </div>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-rose-300">Analógico R</span>
          </div>

          {/* Iconic PlayStation Diamond: △ (top), □ (left), ○ (right), ✕ (bottom) */}
          <div className="flex flex-col items-center gap-1">
            <div className="grid grid-cols-3 gap-1 sm:gap-1.5 w-[114px] sm:w-[140px]">
              <div />
              <button
                type="button"
                aria-label="Triângulo"
                {...bindBtn(8)}
                className={`h-9 sm:h-11 rounded-full border-2 flex items-center justify-center text-sm sm:text-base font-black transition-transform active:scale-95 ${
                  isDown(8)
                    ? 'bg-emerald-500 border-emerald-200 text-slate-950 shadow-[0_0_14px_rgba(16,185,129,0.7)]'
                    : 'bg-[#1A1F2C] border-emerald-500/60 text-emerald-400'
                }`}
              >
                △
              </button>
              <div />

              <button
                type="button"
                aria-label="Quadrado"
                {...bindBtn(9)}
                className={`h-9 sm:h-11 rounded-full border-2 flex items-center justify-center text-sm sm:text-base font-black transition-transform active:scale-95 ${
                  isDown(9)
                    ? 'bg-pink-500 border-pink-200 text-slate-950 shadow-[0_0_14px_rgba(236,72,153,0.7)]'
                    : 'bg-[#1A1F2C] border-pink-500/60 text-pink-400'
                }`}
              >
                □
              </button>
              <div className="h-9 sm:h-11 flex items-center justify-center text-[9px] font-mono text-gray-500">
                PS
              </div>
              <button
                type="button"
                aria-label="Círculo"
                {...bindBtn(0)}
                className={`h-9 sm:h-11 rounded-full border-2 flex items-center justify-center text-sm sm:text-base font-black transition-transform active:scale-95 ${
                  isDown(0)
                    ? 'bg-rose-500 border-rose-200 text-slate-950 shadow-[0_0_14px_rgba(244,63,94,0.7)]'
                    : 'bg-[#1A1F2C] border-rose-500/60 text-rose-400'
                }`}
              >
                ○
              </button>

              <div />
              <button
                type="button"
                aria-label="Cruz"
                {...bindBtn(1)}
                className={`h-9 sm:h-11 rounded-full border-2 flex items-center justify-center text-sm sm:text-base font-black transition-transform active:scale-95 ${
                  isDown(1)
                    ? 'bg-sky-500 border-sky-200 text-slate-950 shadow-[0_0_14px_rgba(56,189,248,0.7)]'
                    : 'bg-[#1A1F2C] border-sky-500/60 text-sky-400'
                }`}
              >
                ✕
              </button>
              <div />
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400">Botões PS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
