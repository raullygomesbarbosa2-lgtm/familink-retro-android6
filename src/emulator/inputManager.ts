// RetroPad 16-bit unified button bit positions:
// 0: A (PS Círculo ○), 1: B (PS Cruz ✕), 2: Select, 3: Start,
// 4: Up, 5: Down, 6: Left, 7: Right,
// 8: X (PS Triângulo △), 9: Y (PS Quadrado □),
// 10: L1, 11: R1, 12: L2, 13: R2, 14: L3, 15: R3

export const RETROARCH_BUTTON_NAMES = [
  'a',
  'b',
  'select',
  'start',
  'up',
  'down',
  'left',
  'right',
  'x',
  'y',
  'l',
  'r',
  'l2',
  'r2',
  'l3',
  'r3',
] as const;

export const KEY_MAP_P1: Record<string, number> = {
  KeyX: 0,        // A / ○ Círculo
  KeyK: 0,        // A alt
  KeyZ: 1,        // B / ✕ Cruz
  KeyJ: 1,        // B alt
  ShiftLeft: 2,   // Select
  ShiftRight: 2,  // Select
  Enter: 3,       // Start
  ArrowUp: 4,     // Up
  KeyW: 4,        // Up alt
  ArrowDown: 5,   // Down
  KeyS: 5,        // Down alt
  ArrowLeft: 6,   // Left
  KeyA: 6,        // Left alt
  ArrowRight: 7,  // Right
  KeyD: 7,        // Right alt
  KeyC: 8,        // X / △ Triângulo
  KeyV: 9,        // Y / □ Quadrado
  KeyQ: 10,       // L1
  KeyE: 11,       // R1
  Digit1: 12,     // L2
  Digit2: 13,     // R2
};

export const KEY_MAP_P2_COUCH: Record<string, number> = {
  KeyM: 0,        // A / ○
  KeyN: 1,        // B / ✕
  KeyO: 2,        // Select
  KeyP: 3,        // Start
  KeyI: 4,        // Up
  KeyK: 5,        // Down
  KeyJ: 6,        // Left
  KeyL: 7,        // Right
  KeyU: 8,        // X / △
  KeyH: 9,        // Y / □
};

export interface BluetoothGamepadConfig {
  p1PadIndex: number; // -1 = automático (primeiro controle detectado)
  p2PadIndex: number; // -1 = automático (segundo controle detectado)
  swapFaceButtons: boolean; // Inverte Cruz/Círculo e Quadrado/Triângulo se desejado
  deadzone: number;
}

export interface DetectedBluetoothGamepad {
  index: number;
  id: string;
  mapping: string;
  buttonsCount: number;
  axesCount: number;
  pressedIndices: number[];
  brandHint: string;
  hasRumble: boolean;
}

export function inferGamepadBrand(id: string): string {
  const lower = id.toLowerCase();
  if (lower.includes('dualsense') || lower.includes('054c-0ce6') || lower.includes('ps5')) {
    return 'PlayStation DualSense (Bluetooth/USB)';
  }
  if (lower.includes('dualshock') || lower.includes('054c-09cc') || lower.includes('054c-05c4') || lower.includes('sony')) {
    return 'PlayStation DualShock 4 (Bluetooth/USB)';
  }
  if (lower.includes('xbox') || lower.includes('xinput') || lower.includes('045e')) {
    return 'Xbox Wireless Bluetooth';
  }
  if (lower.includes('pro controller') || lower.includes('joy-con') || lower.includes('057e')) {
    return 'Nintendo Switch Bluetooth';
  }
  if (lower.includes('8bitdo')) return '8BitDo Bluetooth';
  if (lower.includes('ipega') || lower.includes('pg-')) return 'Ípega Bluetooth';
  if (lower.includes('gamesir')) return 'GameSir Bluetooth';
  if (lower.includes('mocute') || lower.includes('flydigi') || lower.includes('bsp')) {
    return 'Controle Bluetooth Android/HID';
  }
  return 'Controle Bluetooth / USB Genérico';
}

function getSafeGamepads(): Gamepad[] {
  if (typeof navigator === 'undefined') return [];
  try {
    const getPads = navigator.getGamepads || (navigator as Navigator & { webkitGetGamepads?: () => (Gamepad | null)[] }).webkitGetGamepads;
    if (typeof getPads !== 'function') return [];
    const raw = getPads.call(navigator);
    if (!raw || typeof raw.length !== 'number') return [];
    const pads: Gamepad[] = [];
    for (let i = 0; i < raw.length; i++) {
      const pad = raw[i];
      if (pad && pad.connected) pads.push(pad);
    }
    return pads;
  } catch {
    // Android 6 browsers can expose the API but throw until a button is pressed.
    return [];
  }
}

export function listConnectedGamepads(): DetectedBluetoothGamepad[] {
  const raw = getSafeGamepads();
  const list: DetectedBluetoothGamepad[] = [];
  for (let i = 0; i < raw.length; i++) {
    const gp = raw[i];
    if (!gp.connected) continue;
    if (!gp || !gp.connected) continue;
    const pressedIndices: number[] = [];
    gp.buttons.forEach((b, idx) => {
      if (b.pressed || b.value > 0.5) pressedIndices.push(idx);
    });
    const hasRumble = Boolean(
      (gp as Gamepad & { vibrationActuator?: { playEffect?: unknown } }).vibrationActuator?.playEffect
    );
    list.push({
      index: gp.index,
      id: gp.id,
      mapping: gp.mapping || 'non-standard',
      buttonsCount: gp.buttons.length,
      axesCount: gp.axes.length,
      pressedIndices,
      brandHint: inferGamepadBrand(gp.id),
      hasRumble,
    });
  }
  return list;
}

export function readGamepadMask(
  port: 0 | 1,
  config?: Partial<BluetoothGamepadConfig>
): number {
  const pads = getSafeGamepads();
  if (pads.length === 0) return 0;

  let pad: Gamepad | undefined;
  const targetIndex = port === 0 ? config?.p1PadIndex : config?.p2PadIndex;
  if (typeof targetIndex === 'number' && targetIndex >= 0) {
    pad = pads.find((p) => p.index === targetIndex);
  } else {
    pad = pads[port];
  }
  if (!pad || !pad.connected) return 0;

  const deadzone = config?.deadzone ?? 0.35;
  const swap = Boolean(config?.swapFaceButtons);

  let mask = 0;
  const buttons = pad.buttons || [];
  const axes = pad.axes || [];
  const pressed = (idx: number) => Boolean(buttons[idx]?.pressed || (buttons[idx]?.value ?? 0) > 0.45);

  // Face buttons (Standard PlayStation / Xbox / Switch / Generic Bluetooth)
  // Standard W3C: 0=Bottom (Cruz ✕ / A), 1=Right (Círculo ○ / B), 2=Left (Quadrado □ / X), 3=Top (Triângulo △ / Y)
  const btnBottom = pressed(0);
  const btnRight = pressed(1);
  const btnLeft = pressed(2);
  const btnTop = pressed(3);

  if (!swap) {
    if (btnRight) mask |= 1 << 0;  // A / ○ Círculo
    if (btnBottom) mask |= 1 << 1; // B / ✕ Cruz
    if (btnTop) mask |= 1 << 8;    // X / △ Triângulo
    if (btnLeft) mask |= 1 << 9;   // Y / □ Quadrado
  } else {
    if (btnBottom) mask |= 1 << 0;
    if (btnRight) mask |= 1 << 1;
    if (btnLeft) mask |= 1 << 8;
    if (btnTop) mask |= 1 << 9;
  }

  // Standard and most Android HID mappings share these extra button positions.
  // Keep a fallback for generic Bluetooth/USB D-Input pads on older browsers.
  if (buttons.length >= 12) {
    if (pressed(4)) mask |= 1 << 10;  // L1 / LB
    if (pressed(5)) mask |= 1 << 11;  // R1 / RB
    if (pressed(6)) mask |= 1 << 12;  // L2 / LT
    if (pressed(7)) mask |= 1 << 13;  // R2 / RT
    if (pressed(8)) mask |= 1 << 2;   // Select / Share
    if (pressed(9)) mask |= 1 << 3;   // Start / Options
    if (pressed(10)) mask |= 1 << 14; // L3
    if (pressed(11)) mask |= 1 << 15; // R3
  }

  // Standard D-pad buttons (12..15), where present, and left stick fallback.
  const axX = axes[0] ?? 0;
  const axY = axes[1] ?? 0;
  if ((buttons.length >= 16 && pressed(12)) || axY < -deadzone) mask |= 1 << 4;
  if ((buttons.length >= 16 && pressed(13)) || axY > deadzone) mask |= 1 << 5;
  if ((buttons.length >= 16 && pressed(14)) || axX < -deadzone) mask |= 1 << 6;
  if ((buttons.length >= 16 && pressed(15)) || axX > deadzone) mask |= 1 << 7;

  // Android / Generic Bluetooth POV Hat Switch on axes[9]
  if (axes.length > 9) {
    const hat = axes[9];
    if (hat >= -1.05 && hat <= 1.05) {
      // Standard Android/Linux HID hat encoding: -1=Up, -0.43=Right, +0.14=Down, +0.71=Left
      if (hat < -0.75 || hat > 0.85) mask |= 1 << 4;
      if (hat > -0.65 && hat < -0.1) mask |= 1 << 7;
      if (hat > -0.05 && hat < 0.45) mask |= 1 << 5;
      if (hat > 0.5 && hat < 0.95) mask |= 1 << 6;
    }
  }

  return mask;
}

export async function triggerGamepadRumble(padIndex: number): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return false;
  const gp = navigator.getGamepads()[padIndex] as
    | (Gamepad & {
        vibrationActuator?: {
          playEffect: (
            type: string,
            params: { duration: number; strongMagnitude: number; weakMagnitude: number }
          ) => Promise<string>;
        };
      })
    | null;
  if (!gp?.vibrationActuator?.playEffect) return false;
  try {
    await gp.vibrationActuator.playEffect('dual-rumble', {
      duration: 240,
      strongMagnitude: 0.7,
      weakMagnitude: 0.5,
    });
    return true;
  } catch {
    return false;
  }
}

export async function requestBluetoothGamepadAccess(): Promise<{
  ok: boolean;
  deviceName?: string;
  message: string;
}> {
  // Try Web Bluetooth first (works on Chrome Android/Desktop outside restricted iframe policies)
  const nav = navigator as Navigator & {
    bluetooth?: {
      requestDevice: (options: {
        acceptAllDevices: boolean;
        optionalServices?: string[];
      }) => Promise<{ name?: string }>;
    };
    hid?: {
      requestDevice: (options: { filters: unknown[] }) => Promise<Array<{ productName?: string }>>;
    };
  };

  if (nav.bluetooth?.requestDevice) {
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['human_interface_device', 'battery_service', 'device_information'],
      });
      return {
        ok: true,
        deviceName: device.name || 'Controle Bluetooth',
        message: `Dispositivo "${device.name || 'Controle Bluetooth'}" pareado! Pressione qualquer botão nele para começar a jogar.`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/cancel/i.test(msg)) {
        return { ok: false, message: 'Seleção Bluetooth cancelada pelo usuário.' };
      }
      // Fall through to WebHID or OS Gamepad guidance if iframe blocks Web Bluetooth
    }
  }

  if (nav.hid?.requestDevice) {
    try {
      const devices = await nav.hid.requestDevice({ filters: [] });
      if (devices.length > 0) {
        return {
          ok: true,
          deviceName: devices[0].productName || 'Controle HID',
          message: `Controle "${devices[0].productName || 'Bluetooth/USB'}" autorizado! Pressione qualquer botão para usar.`,
        };
      }
    } catch {
      // Fallback guidance below
    }
  }

  return {
    ok: false,
    message:
      'Pareie seu controle Bluetooth nas configurações do celular/PC e pressione qualquer botão (✕, ○, Start ou D-Pad). O FamiLink detecta automaticamente controles PS4/PS5 DualSense, Xbox, Switch Pro, 8BitDo, Ípega e genéricos!',
  };
}
