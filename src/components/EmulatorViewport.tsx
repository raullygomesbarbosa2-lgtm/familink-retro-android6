import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NES } from 'jsnes';
import { Nostalgist } from 'nostalgist';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Save,
  Download,
  Monitor,
  Gamepad2,
  ShieldAlert,
  Lock,
  Loader2,
  Bluetooth,
  Gauge,
} from 'lucide-react';
import { NesAudioEngine } from '../emulator/audioEngine';
import { loadRetroArchCoreBlobs } from '../emulator/coreLoader';
import { CLASSIC_CONSOLE_CORES, getConsoleSpecById } from '../emulator/coreRegistry';
import {
  KEY_MAP_P1,
  KEY_MAP_P2_COUCH,
  RETROARCH_BUTTON_NAMES,
  listConnectedGamepads,
  readGamepadMask,
  type BluetoothGamepadConfig,
  type DetectedBluetoothGamepad,
} from '../emulator/inputManager';
import { applyControllerMask, type NetplayTransport } from '../netplay/NetplayEngine';
import type { ParsedRom } from '../emulator/romUtils';
import type { GuestAccessStatus } from '../netplay/roomService';
import { PlayStationController } from './PlayStationController';

export type PlayMode = 'solo' | 'couch-2p' | 'netplay-host' | 'netplay-guest';

export interface BiosFileItem {
  name: string;
  bytes: Uint8Array;
}

function sanitizeVirtualFilename(name: string): string {
  const parts = name.split('.');
  const ext = parts.length > 1 ? `.${parts.pop()!.replace(/[^a-zA-Z0-9]/g, '')}` : '';
  const base = parts.join('.').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'rom';
  return `${base}${ext}`;
}

function isFatalCoreLog(level: string, rawMsg: string): boolean {
  const msg = rawMsg.toLowerCase();
  if (
    msg.includes('retroarch.cfg') ||
    msg.includes('playlist') ||
    msg.includes('autoconfig') ||
    msg.includes('remap') ||
    msg.includes('cheevos') ||
    msg.includes('thumbnail') ||
    msg.includes('wake lock') ||
    msg.includes('permissions policy') ||
    msg.includes('shader') ||
    msg.includes('font') ||
    msg.includes('audio_resampler')
  ) {
    return false;
  }
  if (
    msg.includes('failed to load content') ||
    msg.includes('failed to open libretro core') ||
    msg.includes('unable to load') ||
    msg.includes('could not load') ||
    msg.includes('does not support') ||
    msg.includes('was not found in romset') ||
    msg.includes('not found in romset') ||
    msg.includes('required files are missing') ||
    msg.includes('error loading') ||
    msg.includes('starting menu') ||
    msg.includes('menu_init') ||
    msg.includes('retro_load_game') ||
    /rom[^\n]*not found/i.test(msg)
  ) {
    return true;
  }
  return level === 'error' && /(failed|missing|not found|unsupported|invalid rom|corrupt|required)/i.test(msg);
}

interface EmulatorViewportProps {
  rom: ParsedRom | null;
  biosFiles?: BiosFileItem[];
  playMode: PlayMode;
  guestAccessStatus?: GuestAccessStatus;
  netplayTransport?: NetplayTransport | null;
  inputDelay?: number;
  btConfig: BluetoothGamepadConfig;
  onStatusMessage?: (msg: string) => void;
  onToggleControlsGuide?: () => void;
}

export const EmulatorViewport: React.FC<EmulatorViewportProps> = ({
  rom,
  biosFiles = [],
  playMode,
  guestAccessStatus = 'empty',
  netplayTransport = null,
  inputDelay = 1,
  btConfig,
  onStatusMessage,
  onToggleControlsGuide,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nesRef = useRef<NES | null>(null);
  const nostalgistRef = useRef<Nostalgist | null>(null);
  const audioRef = useRef<NesAudioEngine | null>(null);

  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [scanlines, setScanlines] = useState(true);
  const [fpsMode, setFpsMode] = useState<30 | 60>(() => {
    if (typeof window === 'undefined') return 60;
    const saved = localStorage.getItem('familink_fps_mode');
    if (saved === '30') return 30;
    if (saved === '60') return 60;
    return window.innerWidth <= 768 ? 30 : 60;
  });
  // PlayStation controller active & visible automatically on startup!
  const [showPlayStationPad, setShowPlayStationPad] = useState(true);
  const [hasSavedState, setHasSavedState] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [coreLoading, setCoreLoading] = useState(false);
  const [coreError, setCoreError] = useState<string | null>(null);
  const [overrideCore, setOverrideCore] = useState<string | null>(null);
  const [resetNonce, setResetNonce] = useState(0);
  const [activeDisplayMask, setActiveDisplayMask] = useState(0);
  const [connectedPads, setConnectedPads] = useState<DetectedBluetoothGamepad[]>([]);

  // Input bitmasks
  const p1KeyMaskRef = useRef(0);
  const p2KeyMaskRef = useRef(0);
  const touchMaskRef = useRef(0);
  const remoteP2MaskRef = useRef(0);
  const appliedP1MaskRef = useRef(0);
  const appliedP2MaskRef = useRef(0);
  const nostalgistP1MaskRef = useRef(0);
  const nostalgistP2MaskRef = useRef(0);
  const prevDisplayMaskRef = useRef(0);
  const p1DelayQueueRef = useRef<number[]>([]);
  const lastSentP2MaskRef = useRef(-1);
  const frameCounterRef = useRef(0);
  const nesDrawTickRef = useRef(0);
  const imgDataRef = useRef<ImageData | null>(null);
  const fpsModeRef = useRef<30 | 60>(fpsMode);
  const pausedRef = useRef(false);
  const guestApprovedRef = useRef(false);
  const playModeRef = useRef<PlayMode>(playMode);
  const transportRef = useRef<NetplayTransport | null>(netplayTransport);
  const inputDelayRef = useRef(inputDelay);
  const btConfigRef = useRef(btConfig);
  const nostalgistSavedBlobRef = useRef<Blob | null>(null);
  const failedCoresRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fpsModeRef.current = fpsMode;
    try {
      localStorage.setItem('familink_fps_mode', String(fpsMode));
    } catch {
      // ignore storage errors
    }
  }, [fpsMode]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    playModeRef.current = playMode;
  }, [playMode]);

  useEffect(() => {
    transportRef.current = netplayTransport;
  }, [netplayTransport]);

  useEffect(() => {
    inputDelayRef.current = inputDelay;
  }, [inputDelay]);

  useEffect(() => {
    btConfigRef.current = btConfig;
  }, [btConfig]);

  // Auto-detect Bluetooth / USB controllers immediately & on connect/disconnect
  useEffect(() => {
    const syncPads = () => {
      const pads = listConnectedGamepads();
      setConnectedPads(pads);
    };
    syncPads();
    const onConnect = (ev: GamepadEvent) => {
      syncPads();
      onStatusMessage?.(`Controle Bluetooth/USB conectado automaticamente: ${ev.gamepad.id}`);
    };
    const onDisconnect = () => {
      syncPads();
    };
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    const id = window.setInterval(syncPads, 1000);
    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
      window.clearInterval(id);
    };
  }, [onStatusMessage]);

  useEffect(() => {
    const wasApproved = guestApprovedRef.current;
    const isNowApproved = guestAccessStatus === 'approved';
    guestApprovedRef.current = isNowApproved;

    if (
      !wasApproved &&
      isNowApproved &&
      playModeRef.current === 'netplay-host' &&
      nesRef.current &&
      transportRef.current
    ) {
      try {
        const snapshot = nesRef.current.toJSON();
        transportRef.current.sendStateSync(frameCounterRef.current, snapshot);
      } catch {
        // ignore
      }
    }
  }, [guestAccessStatus]);

  useEffect(() => {
    setOverrideCore(null);
    failedCoresRef.current.clear();
    if (!rom) {
      setHasSavedState(false);
      nostalgistSavedBlobRef.current = null;
      return;
    }
    if (rom.usesJsNesDirect) {
      setHasSavedState(Boolean(localStorage.getItem(`familink_save_${rom.sha256}`)));
    } else {
      setHasSavedState(Boolean(nostalgistSavedBlobRef.current));
    }
  }, [rom]);

  const drawFrameBuffer = useCallback((fb: number[]) => {
    nesDrawTickRef.current += 1;
    // Em modo 30 FPS (Celular Fraco), pula frames ímpares no Canvas mantendo áudio e física em 60Hz
    if (fpsModeRef.current === 30 && nesDrawTickRef.current % 2 === 1) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let imgData = imgDataRef.current;
    if (!imgData || imgData.width !== 256 || imgData.height !== 240) {
      imgData = ctx.createImageData(256, 240);
      imgDataRef.current = imgData;
    }
    const data32 = new Uint32Array(imgData.data.buffer);
    for (let i = 0; i < 256 * 240; i++) {
      data32[i] = 0xff000000 | fb[i];
    }
    ctx.putImageData(imgData, 0, 0);
  }, []);

  const activeWebCore = rom ? (overrideCore || rom.webCore) : '';
  const useJsNesDirectNow = Boolean(rom && rom.usesJsNesDirect && activeWebCore === 'jsnes');

  // Initialize Emulator Core (JSNES for .nes default + auto-fallback to fceumm, Nostalgist local-zip WASM for all consoles)
  useEffect(() => {
    setCoreError(null);
    nostalgistP1MaskRef.current = 0;
    nostalgistP2MaskRef.current = 0;

    if (!rom) {
      nesRef.current = null;
      if (nostalgistRef.current) {
        try {
          if (nostalgistRef.current.getStatus() !== 'terminated') {
            nostalgistRef.current.exit({ removeCanvas: false });
          }
        } catch {
          // ignore
        }
        nostalgistRef.current = null;
      }
      return;
    }

    if (useJsNesDirectNow) {
      setCoreLoading(false);
      const audio = new NesAudioEngine();
      audioRef.current = audio;
      audio.setMuted(muted);

      const nes = new NES({
        onFrame: (fb) => {
          drawFrameBuffer(fb);
        },
        onAudioSample: (left, right) => {
          audio.pushSample(left, right);
        },
        emulateSound: true,
        sampleRate: 44100,
      });

      try {
        nes.loadROM(rom.binaryString);
      } catch (err) {
        audio.destroy();
        audioRef.current = null;
        nesRef.current = null;
        // Alterna automaticamente para motor fceumm WASM caso mapper não seja suportado
        onStatusMessage?.(
          `Mapper NES não suportado no motor rápido (${err instanceof Error ? err.message : 'erro'}). Alternando automaticamente para fceumm...`
        );
        setOverrideCore('fceumm');
        return;
      }

      nesRef.current = nes;
      frameCounterRef.current = 0;
      nesDrawTickRef.current = 0;
      appliedP1MaskRef.current = 0;
      appliedP2MaskRef.current = 0;
      remoteP2MaskRef.current = 0;
      p1DelayQueueRef.current = [];
      setFrameCount(0);
      setPaused(false);

      return () => {
        audio.destroy();
        audioRef.current = null;
        nesRef.current = null;
      };
    }

    // Executa núcleo WASM direto no Canvas HTML5 (Zero RetroArch UI e Zero WebView)
    const abortController = new AbortController();
    let launchedInstance: Nostalgist | null = null;
    const coreLogs: string[] = [];
    let fatalLogMessage: string | null = null;
    setCoreLoading(true);
    setPaused(false);

    const handleFatalCoreFailure = (reason: string, inst?: Nostalgist | null) => {
      if (abortController.signal.aborted) return;
      abortController.abort();
      if (inst) {
        try {
          if (inst.getStatus() !== 'terminated') {
            inst.exit({ removeCanvas: false });
          }
        } catch {
          // ignore
        }
      }
      if (nostalgistRef.current) {
        try {
          if (nostalgistRef.current.getStatus() !== 'terminated') {
            nostalgistRef.current.exit({ removeCanvas: false });
          }
        } catch {
          // ignore
        }
        nostalgistRef.current = null;
      }

      failedCoresRef.current.add(activeWebCore);
      const spec = getConsoleSpecById(rom.consoleId);
      const nextFallback = spec.altWebCores.find((c) => !failedCoresRef.current.has(c));
      if (nextFallback) {
        onStatusMessage?.(
          `Motor ${activeWebCore} não abriu esta ROM. Testando automaticamente ${nextFallback}...`
        );
        setOverrideCore(nextFallback);
        return;
      }

      setCoreLoading(false);
      const isArcade = ['arcade', 'arcade2000', 'arcade2003', 'arcade2003plus', 'arcade2010', 'arcade2013', 'arcade2013plus', 'neogeo'].includes(rom.consoleId);
      const hint = isArcade
        ? ' Verifique se o .zip pertence a esse pacote Arcade ou anexe a BIOS (ex: neogeo.zip) ao lado.'
        : ' Verifique se o arquivo da ROM não está corrompido.';
      setCoreError(`Não foi possível iniciar esta ROM no motor ${activeWebCore}: ${reason}.${hint}`);
    };

    const launchMultiCore = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const coreBlobs = await loadRetroArchCoreBlobs(activeWebCore);
        if (abortController.signal.aborted) return;

        const safeRomName = sanitizeVirtualFilename(rom.name);
        const romBlob = new Blob([new Uint8Array(rom.bytes)], { type: 'application/octet-stream' });
        const biosList = biosFiles.map((b) => ({
          fileName: sanitizeVirtualFilename(b.name),
          fileContent: new Blob([new Uint8Array(b.bytes)], { type: 'application/octet-stream' }),
        }));

        const instance = await Nostalgist.launch({
          element: canvas,
          signal: abortController.signal,
          core: coreBlobs,
          rom: [
            {
              fileName: safeRomName,
              fileContent: romBlob,
            },
            ...biosList,
          ],
          ...(biosList.length > 0 ? { bios: biosList } : {}),
          size: {
            width: 640,
            height: 480,
          },
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          },
          onLog: ({ level, message }) => {
            if (level === 'error') {
              coreLogs.push(message);
            }
            if (!fatalLogMessage && isFatalCoreLog(level, message)) {
              fatalLogMessage = message;
              // Se já havia iniciado após o launch, fecha imediatamente para jamais exibir menu do RetroArch
              if (launchedInstance) {
                handleFatalCoreFailure(message, launchedInstance);
              }
            }
          },
          retroarchConfig: {
            audio_mute_enable: muted,
            audio_sync: true,
            log_verbosity: true,
            libretro_log_level: 0,
            suspend_screensaver_enable: false,
            pause_nonactive: false,
            pause_on_disconnect: false,
            savestate_thumbnail_enable: false,
            // Desempenho 30 FPS (Celular Fraco) vs 60 FPS (Celular Forte)
            video_swap_interval: fpsMode === 30 ? 2 : 1,
            video_max_swapchain_images: fpsMode === 30 ? 2 : 3,
            // Bloqueia completamente tela inicial, menu, atalhos de controle, fonte e banners OSD do RetroArch
            rgui_show_start_screen: false,
            video_font_enable: false,
            notification_show_autoconfig: false,
            notification_show_cheats_applied: false,
            notification_show_config_override_load: false,
            notification_show_fast_forward: false,
            notification_show_netplay_extra: false,
            notification_show_patch_applied: false,
            notification_show_refresh_rate: false,
            notification_show_remap_load: false,
            notification_show_save_state: false,
            notification_show_screenshot: false,
            notification_show_set_initial_disk: false,
            notification_show_when_menu_is_alive: false,
            input_menu_toggle: 'nul',
            input_desktop_menu_toggle: 'nul',
            input_menu_toggle_gamepad_combo: 0,
            input_quit_gamepad_combo: 0,
            input_player1_analog_dpad_mode: 1,
            input_player2_analog_dpad_mode: 1,
            input_player1_a: 'x',
            input_player1_b: 'z',
            input_player1_select: 'rshift',
            input_player1_start: 'enter',
            input_player1_up: 'up',
            input_player1_down: 'down',
            input_player1_left: 'left',
            input_player1_right: 'right',
            input_player1_x: 's',
            input_player1_y: 'a',
            input_player1_l: 'q',
            input_player1_r: 'w',
            input_player1_l2: 'keypad1',
            input_player1_r2: 'keypad2',
            input_player1_l3: 'keypad3',
            input_player1_r3: 'keypad4',
            input_player2_a: 'm',
            input_player2_b: 'n',
            input_player2_select: 'o',
            input_player2_start: 'p',
            input_player2_up: 'i',
            input_player2_down: 'k',
            input_player2_left: 'j',
            input_player2_right: 'l',
            input_player2_x: 'u',
            input_player2_y: 'h',
            input_player2_l: 'y',
            input_player2_r: 't',
            input_player2_l2: 'keypad5',
            input_player2_r2: 'keypad6',
            input_player2_l3: 'keypad7',
            input_player2_r3: 'keypad8',
          },
        });

        if (abortController.signal.aborted) {
          try {
            if (instance.getStatus() !== 'terminated') {
              instance.exit({ removeCanvas: false });
            }
          } catch {
            // ignore
          }
          return;
        }

        if (fatalLogMessage || instance.getStatus() === 'terminated') {
          handleFatalCoreFailure(
            fatalLogMessage || coreLogs[coreLogs.length - 1] || 'Conteúdo incompatível com este motor',
            instance
          );
          return;
        }

        launchedInstance = instance;
        nostalgistRef.current = instance;
        setCoreLoading(false);
      } catch (err) {
        if (!abortController.signal.aborted) {
          const msg = err instanceof Error ? err.message : 'Falha ao inicializar motor WASM.';
          const detail = coreLogs.length > 0 ? ` (${coreLogs[coreLogs.length - 1]})` : '';
          handleFatalCoreFailure(`${msg}${detail}`);
        }
      }
    };

    void launchMultiCore();

    return () => {
      abortController.abort();
      if (launchedInstance) {
        try {
          if (launchedInstance.getStatus() !== 'terminated') {
            launchedInstance.exit({ removeCanvas: false });
          }
        } catch {
          // ignore
        }
      }
      if (nostalgistRef.current) {
        try {
          if (nostalgistRef.current.getStatus() !== 'terminated') {
            nostalgistRef.current.exit({ removeCanvas: false });
          }
        } catch {
          // ignore
        }
        nostalgistRef.current = null;
      }
    };
  }, [rom, biosFiles, activeWebCore, useJsNesDirectNow, fpsMode, resetNonce, drawFrameBuffer, onStatusMessage]);

  // Keep audio mute synced
  useEffect(() => {
    audioRef.current?.setMuted(muted);
    if (nostalgistRef.current && nostalgistRef.current.getStatus() !== 'terminated') {
      try {
        nostalgistRef.current.sendCommand('MUTE');
      } catch {
        // ignore if unavailable
      }
    }
  }, [muted]);

  // Keyboard listeners + capture-phase blocker for F1..F12 & Escape so internal menu keys never fire
  useEffect(() => {
    const blockMenuHotkeys = (e: KeyboardEvent) => {
      if (/^F([1-9]|1[0-2])$/.test(e.code) || e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (e.code in KEY_MAP_P1) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
        }
        p1KeyMaskRef.current |= 1 << KEY_MAP_P1[e.code];
        audioRef.current?.start();
      }

      if (playModeRef.current === 'couch-2p' && e.code in KEY_MAP_P2_COUCH) {
        p2KeyMaskRef.current |= 1 << KEY_MAP_P2_COUCH[e.code];
        audioRef.current?.start();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code in KEY_MAP_P1) {
        p1KeyMaskRef.current &= ~(1 << KEY_MAP_P1[e.code]);
      }
      if (e.code in KEY_MAP_P2_COUCH) {
        p2KeyMaskRef.current &= ~(1 << KEY_MAP_P2_COUCH[e.code]);
      }
    };

    window.addEventListener('keydown', blockMenuHotkeys, true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', blockMenuHotkeys, true);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Helper to diff-push 16-bit RetroPad masks into Nostalgist for ALL consoles
  const syncNostalgistMask = (
    instance: Nostalgist,
    player: 1 | 2,
    prevMask: number,
    nextMask: number
  ): number => {
    if (prevMask === nextMask) return nextMask;
    try {
      if (instance.getStatus() === 'terminated') return nextMask;
      const diff = prevMask ^ nextMask;
      for (let i = 0; i < RETROARCH_BUTTON_NAMES.length; i++) {
        const bit = 1 << i;
        if (diff & bit) {
          if (nextMask & bit) {
            instance.pressDown({ button: RETROARCH_BUTTON_NAMES[i], player });
          } else {
            instance.pressUp({ button: RETROARCH_BUTTON_NAMES[i], player });
          }
        }
      }
    } catch {
      // ignore if core is exiting or terminated
    }
    return nextMask;
  };

  // Wire Netplay incoming packets
  useEffect(() => {
    if (!netplayTransport) return;

    const origCallbacks = (netplayTransport as unknown as {
      callbacks: {
        onP2Input: (mask: number) => void;
        onFrameInputs: (frame: number, p1Mask: number, p2Mask: number) => void;
        onStateSync: (frame: number, state: Record<string, unknown>) => void;
        onRoomControl: (action: 'reset' | 'pause' | 'resume') => void;
      };
    }).callbacks;

    origCallbacks.onP2Input = (mask: number) => {
      if (playModeRef.current === 'netplay-host' && guestApprovedRef.current) {
        remoteP2MaskRef.current = mask;
        if (nostalgistRef.current) {
          nostalgistP2MaskRef.current = syncNostalgistMask(
            nostalgistRef.current,
            2,
            nostalgistP2MaskRef.current,
            mask
          );
        }
      }
    };

    origCallbacks.onFrameInputs = (frame: number, p1Mask: number, p2Mask: number) => {
      if (playModeRef.current !== 'netplay-guest' || !guestApprovedRef.current) return;
      if (pausedRef.current) return;

      if (nesRef.current) {
        appliedP1MaskRef.current = applyControllerMask(nesRef.current, 1, appliedP1MaskRef.current, p1Mask);
        appliedP2MaskRef.current = applyControllerMask(nesRef.current, 2, appliedP2MaskRef.current, p2Mask);
        nesRef.current.frame();
      }
      frameCounterRef.current = frame;
      if (frame % 15 === 0) setFrameCount(frame);
    };

    origCallbacks.onStateSync = (frame: number, state: Record<string, unknown>) => {
      if (playModeRef.current !== 'netplay-guest' || !guestApprovedRef.current || !nesRef.current) return;
      try {
        nesRef.current.fromJSON(state);
        frameCounterRef.current = frame;
        setFrameCount(frame);
      } catch {
        // ignore transient sync error
      }
    };

    origCallbacks.onRoomControl = (action) => {
      if (playModeRef.current !== 'netplay-guest') return;
      if (action === 'reset') {
        if (nesRef.current) {
          nesRef.current.reset();
        } else {
          setPaused(false);
          setResetNonce((n) => n + 1);
        }
      } else if (action === 'pause') {
        setPaused(true);
        try {
          if (nostalgistRef.current && nostalgistRef.current.getStatus() !== 'terminated') {
            nostalgistRef.current.pause();
          }
        } catch {
          // ignore
        }
      } else if (action === 'resume') {
        setPaused(false);
        try {
          if (nostalgistRef.current && nostalgistRef.current.getStatus() !== 'terminated') {
            nostalgistRef.current.resume();
          }
        } catch {
          // ignore
        }
      }
    };
  }, [netplayTransport]);

  // Continuous 60Hz Loop: reads Bluetooth Gamepads + Keyboard + PlayStation On-Screen Pad
  // Works even when no ROM is loaded so the on-screen PlayStation pad reacts live to Bluetooth presses!
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    const STEP = 1000 / 60;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const delta = Math.min(100, now - lastTime);
      lastTime = now;
      accumulator += delta;

      while (accumulator >= STEP) {
        accumulator -= STEP;

        const btCfg = btConfigRef.current;
        const btP1 = readGamepadMask(0, btCfg);
        const btP2 = readGamepadMask(1, btCfg);
        const rawP1 = p1KeyMaskRef.current | touchMaskRef.current | btP1;

        if (rawP1 !== prevDisplayMaskRef.current) {
          prevDisplayMaskRef.current = rawP1;
          setActiveDisplayMask(rawP1);
        }

        if (!rom || pausedRef.current) continue;

        const mode = playModeRef.current;

        if (mode === 'netplay-guest') {
          if (guestApprovedRef.current && transportRef.current) {
            if (rawP1 !== lastSentP2MaskRef.current || frameCounterRef.current % 15 === 0) {
              lastSentP2MaskRef.current = rawP1;
              transportRef.current.sendP2Input(rawP1);
            }
          }
          continue;
        }

        let p1Mask = rawP1;
        if (mode === 'netplay-host' && guestApprovedRef.current && inputDelayRef.current > 0) {
          p1DelayQueueRef.current.push(rawP1);
          while (p1DelayQueueRef.current.length > inputDelayRef.current) {
            p1Mask = p1DelayQueueRef.current.shift() ?? rawP1;
          }
        } else {
          p1DelayQueueRef.current = [];
        }

        let p2Mask = 0;
        if (mode === 'couch-2p') {
          p2Mask = p2KeyMaskRef.current | btP2;
        } else if (mode === 'netplay-host' && guestApprovedRef.current) {
          p2Mask = remoteP2MaskRef.current;
        }

        // Forward inputs to JSNES (NES)
        const nes = nesRef.current;
        if (nes) {
          // On 2-button NES, allow △ (bit 8) to trigger A and □ (bit 9) to trigger B for comfort on PS layout
          const nesP1 =
            (p1Mask & 0xff) |
            (p1Mask & (1 << 8) ? 1 << 0 : 0) |
            (p1Mask & (1 << 9) ? 1 << 1 : 0);
          const nesP2 =
            (p2Mask & 0xff) |
            (p2Mask & (1 << 8) ? 1 << 0 : 0) |
            (p2Mask & (1 << 9) ? 1 << 1 : 0);

          appliedP1MaskRef.current = applyControllerMask(nes, 1, appliedP1MaskRef.current, nesP1);
          appliedP2MaskRef.current = applyControllerMask(nes, 2, appliedP2MaskRef.current, nesP2);

          nes.frame();
          frameCounterRef.current += 1;

          if (frameCounterRef.current % 15 === 0) {
            setFrameCount(frameCounterRef.current);
          }

          if (mode === 'netplay-host' && guestApprovedRef.current && transportRef.current) {
            transportRef.current.sendFrameInputs(frameCounterRef.current, nesP1, nesP2);
            if (frameCounterRef.current % 90 === 0) {
              try {
                transportRef.current.sendStateSync(frameCounterRef.current, nes.toJSON());
              } catch {
                // ignore
              }
            }
          }
        }

        // Forward ALL 16 PlayStation/Bluetooth/Keyboard inputs to Nostalgist (38+ other consoles)
        const nostalgist = nostalgistRef.current;
        if (nostalgist) {
          nostalgistP1MaskRef.current = syncNostalgistMask(
            nostalgist,
            1,
            nostalgistP1MaskRef.current,
            p1Mask
          );
          if (mode === 'couch-2p') {
            nostalgistP2MaskRef.current = syncNostalgistMask(
              nostalgist,
              2,
              nostalgistP2MaskRef.current,
              p2Mask
            );
          }
        }
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [rom]);

  const handleTogglePause = () => {
    if (!rom || coreLoading || coreError || playMode === 'netplay-guest') return;
    audioRef.current?.start();
    const next = !paused;
    setPaused(next);
    if (nostalgistRef.current && nostalgistRef.current.getStatus() !== 'terminated') {
      try {
        if (next) nostalgistRef.current.pause();
        else nostalgistRef.current.resume();
      } catch {
        // ignore if core cannot pause
      }
    }
    if (playMode === 'netplay-host') {
      netplayTransport?.sendRoomControl(next ? 'pause' : 'resume');
    }
  };

  const handleReset = () => {
    if (!rom || coreLoading || playMode === 'netplay-guest') return;
    audioRef.current?.start();
    setPaused(false);
    if (nesRef.current) {
      nesRef.current.reset();
      frameCounterRef.current = 0;
      setFrameCount(0);
    } else {
      // Reinicialização limpa do motor WASM evita RuntimeError em Module._cmd_reset()
      setResetNonce((n) => n + 1);
    }
    if (playMode === 'netplay-host') {
      netplayTransport?.sendRoomControl('reset');
      if (guestAccessStatus === 'approved' && nesRef.current) {
        try {
          netplayTransport?.sendStateSync(0, nesRef.current.toJSON());
        } catch {
          // ignore
        }
      }
    }
  };

  const handleSaveState = async () => {
    if (!rom || playMode === 'netplay-guest') return;
    if (nesRef.current) {
      try {
        const state = nesRef.current.toJSON();
        localStorage.setItem(`familink_save_${rom.sha256}`, JSON.stringify(state));
        setHasSavedState(true);
        onStatusMessage?.('Estado salvo localmente para esta ROM.');
      } catch {
        onStatusMessage?.('Não foi possível salvar o estado no navegador.');
      }
      return;
    }
    if (nostalgistRef.current) {
      try {
        const { state } = await nostalgistRef.current.saveState();
        nostalgistSavedBlobRef.current = state;
        setHasSavedState(true);
        onStatusMessage?.(`Estado salvo na memória para ${rom.consoleName}.`);
      } catch {
        onStatusMessage?.('Erro ao salvar estado neste núcleo.');
      }
    }
  };

  const handleLoadState = async () => {
    if (!rom || playMode === 'netplay-guest') return;
    if (nesRef.current) {
      const raw = localStorage.getItem(`familink_save_${rom.sha256}`);
      if (!raw) return;
      try {
        const state = JSON.parse(raw) as Record<string, unknown>;
        nesRef.current.fromJSON(state);
        if (playMode === 'netplay-host' && guestAccessStatus === 'approved') {
          netplayTransport?.sendStateSync(frameCounterRef.current, state);
        }
        onStatusMessage?.('Estado restaurado com sucesso.');
      } catch {
        onStatusMessage?.('Erro ao restaurar estado salvo.');
      }
      return;
    }
    if (nostalgistRef.current && nostalgistSavedBlobRef.current) {
      try {
        await nostalgistRef.current.loadState(nostalgistSavedBlobRef.current);
        onStatusMessage?.('Estado restaurado com sucesso.');
      } catch {
        onStatusMessage?.('Erro ao restaurar estado.');
      }
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current.requestFullscreen();
    }
  };

  const handleTouchMaskChange = useCallback((mask: number) => {
    audioRef.current?.start();
    touchMaskRef.current = mask;
  }, []);

  const guestLocked = playMode === 'netplay-guest' && guestAccessStatus !== 'approved';
  const canvasKey = useJsNesDirectNow
    ? `canvas-jsnes-${rom?.sha256.slice(0, 12) || 'empty'}`
    : `canvas-engine-${rom?.consoleId || 'idle'}-${activeWebCore || 'none'}-${fpsMode}fps-${resetNonce}-${rom?.sha256.slice(0, 12) || 'empty'}`;
  const alternateCores = rom
    ? getConsoleSpecById(rom.consoleId).altWebCores.filter((c) => c !== activeWebCore)
    : [];

  return (
    <div ref={containerRef} className="bg-[#12161F] border border-white/10 rounded-xl overflow-hidden flex flex-col">
      {/* Top Emulator Info Strip */}
      <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {rom ? rom.name : 'Nenhuma ROM carregada'}
          </div>
          {rom ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 font-mono tabular-nums mt-0.5">
              <span className="text-white">{rom.consoleName}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">{activeWebCore}</span>
              <span aria-hidden="true">·</span>
              <span className={fpsMode === 30 ? 'text-amber-300' : 'text-emerald-300'}>
                {fpsMode} FPS
              </span>
              <span aria-hidden="true">·</span>
              <span className={rom.region === 'JPN' ? 'text-amber-400 font-semibold' : 'text-sky-400 font-semibold'}>
                {rom.regionLabel}
              </span>
              {useJsNesDirectNow && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Frame {frameCount}</span>
                </>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-400 mt-0.5">
              {CLASSIC_CONSOLE_CORES.length} consoles &amp; Arcade 2000–2013 Plus (sem Sony) · {fpsMode} FPS · Controle PS &amp; Bluetooth ativos
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-gray-300">
          <span>
            {playMode === 'solo' && 'Modo Solo (1P)'}
            {playMode === 'couch-2p' && 'Local 2 Jogadores (Mesmo PC)'}
            {playMode === 'netplay-host' && 'Netplay Host (P1)'}
            {playMode === 'netplay-guest' && 'Netplay Convidado (P2)'}
          </span>
        </div>
      </div>

      {/* Direct Canvas Stage (Zero WebView / Zero RetroArch Menu Screen) */}
      <div className="relative bg-black flex items-center justify-center aspect-[4/3] w-full max-h-[460px] mx-auto overflow-hidden min-h-0">
        <canvas
          key={canvasKey}
          ref={canvasRef}
          width={256}
          height={240}
          onClick={() => audioRef.current?.start()}
          className={`w-full h-full object-contain pixelated cursor-pointer transition-opacity duration-150 ${
            !rom || coreLoading || Boolean(coreError) ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        {scanlines && (
          <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-55" />
        )}

        {!rom && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0B0E14]/92">
            <Gamepad2 className="w-10 h-10 text-[#E11D48] mb-3" />
            <p className="text-sm font-medium text-gray-200">
              Console Clássico Pronto (Sem Jogos de Exemplo)
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              Carregue sua ROM no painel ao lado ou baixe ROMs na aba Núcleos &amp; ROMs. O controle PlayStation na tela e qualquer controle Bluetooth já estão prontos logo abaixo.
            </p>
          </div>
        )}

        {rom && coreLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0B0E14]/90">
            <Loader2 className="w-8 h-8 text-[#E11D48] animate-spin mb-3" />
            <p className="text-sm font-medium text-white">Inicializando motor {activeWebCore} ({fpsMode} FPS) no Canvas...</p>
            <p className="text-xs text-gray-400 mt-1">Execução direta em WebAssembly sem RetroArch e sem WebView.</p>
          </div>
        )}

        {rom && coreError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0B0E14]/95">
            <ShieldAlert className="w-9 h-9 text-[#E11D48] mb-3" />
            <p className="text-sm font-semibold text-white">Falha ao carregar núcleo</p>
            <p className="text-xs text-gray-300 mt-1 max-w-md">{coreError}</p>
            {alternateCores.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                {alternateCores.slice(0, 4).map((altCore) => (
                  <button
                    key={altCore}
                    type="button"
                    onClick={() => setOverrideCore(altCore)}
                    className="px-3 py-1.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-xs font-semibold text-white cursor-pointer"
                  >
                    Tentar {altCore}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {rom && guestLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0B0E14]/92 backdrop-blur-sm">
            {guestAccessStatus === 'denied' ? (
              <>
                <ShieldAlert className="w-10 h-10 text-[#E11D48] mb-3" />
                <p className="text-base font-semibold text-white">Acesso P2 Recusado pelo Host</p>
                <p className="text-xs text-gray-300 mt-1.5 max-w-sm">
                  O Host P1 recusou ou bloqueou sua entrada nesta sala. Solicite acesso novamente ou entre em outra sala.
                </p>
              </>
            ) : (
              <>
                <Lock className="w-10 h-10 text-amber-400 mb-3" />
                <p className="text-base font-semibold text-white">
                  Aguardando Host P1 Liberar o Acesso P2
                </p>
                <p className="text-xs text-gray-300 mt-1.5 max-w-md">
                  Sua ROM e região ({rom.regionLabel}) foram verificadas com sucesso. Assim que o P1 clicar em
                  &ldquo;Liberar Acesso P2&rdquo;, o controle 2 e o vídeo sincronizarão automaticamente.
                </p>
              </>
            )}
          </div>
        )}

        {rom && paused && !guestLocked && !coreLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <span className="px-4 py-2 bg-[#12161F] border border-white/15 rounded-lg text-sm font-semibold text-white tracking-wide">
              PAUSADO
            </span>
          </div>
        )}
      </div>

      {/* PlayStation DualShock / DualSense Stretched On-Screen Controller (D-Pad + Analog L/R Active Automatically!) */}
      {showPlayStationPad && (
        <PlayStationController
          activeMask={activeDisplayMask}
          disabled={guestLocked}
          connectedPads={connectedPads}
          onTouchMaskChange={handleTouchMaskChange}
          onOpenBluetoothModal={() => onToggleControlsGuide?.()}
        />
      )}

      {/* Hardware Action Bar */}
      <div className="px-4 py-3 border-t border-white/10 bg-[#0F131C] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!rom || coreLoading || Boolean(coreError) || playMode === 'netplay-guest'}
            onClick={handleTogglePause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#22293A] disabled:opacity-40 text-xs font-medium text-white border border-white/10 transition-colors whitespace-nowrap cursor-pointer"
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{paused ? 'Continuar' : 'Pausar'}</span>
          </button>

          <button
            type="button"
            disabled={!rom || coreLoading || playMode === 'netplay-guest'}
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#22293A] disabled:opacity-40 text-xs font-medium text-white border border-white/10 transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            disabled={!rom || coreLoading || Boolean(coreError) || playMode === 'netplay-guest'}
            onClick={() => void handleSaveState()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#22293A] disabled:opacity-40 text-xs font-medium text-white border border-white/10 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar</span>
          </button>

          <button
            type="button"
            disabled={!rom || !hasSavedState || coreLoading || Boolean(coreError) || playMode === 'netplay-guest'}
            onClick={() => void handleLoadState()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#22293A] disabled:opacity-40 text-xs font-medium text-white border border-white/10 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Carregar</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              audioRef.current?.start();
              setMuted((m) => !m);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#22293A] text-xs font-medium text-gray-200 border border-white/10 transition-colors whitespace-nowrap cursor-pointer"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-[#E11D48]" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{muted ? 'Mudo' : 'Som'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = fpsMode === 30 ? 60 : 30;
              setFpsMode(next);
              onStatusMessage?.(
                next === 30
                  ? 'Modo 30 FPS ativado (Otimizado para celular mais fraco).'
                  : 'Modo 60 FPS ativado (Desempenho máximo para celular forte).'
              );
            }}
            title="Alternar entre 30 FPS (celular fraco) e 60 FPS (celular forte)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
              fpsMode === 30
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{fpsMode === 30 ? '30 FPS · Fraco' : '60 FPS · Forte'}</span>
          </button>

          <button
            type="button"
            onClick={() => setScanlines((s) => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
              scanlines
                ? 'bg-[#E11D48]/15 border-[#E11D48]/40 text-white'
                : 'bg-[#181D29] border-white/10 text-gray-300 hover:bg-[#22293A]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>CRT</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPlayStationPad((t) => !t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
              showPlayStationPad
                ? 'bg-[#E11D48]/15 border-[#E11D48]/40 text-white'
                : 'bg-[#181D29] border-white/10 text-gray-300 hover:bg-[#22293A]'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Controle PS na Tela</span>
          </button>

          {onToggleControlsGuide && (
            <button
              type="button"
              onClick={onToggleControlsGuide}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#22293A] text-xs font-medium text-sky-300 border border-sky-500/30 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Bluetooth className="w-3.5 h-3.5" />
              <span>Bluetooth / Teclas</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#22293A] text-xs font-medium text-gray-200 border border-white/10 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Tela Cheia</span>
          </button>
        </div>
      </div>
    </div>
  );
};
