import { Controller, type NES } from 'jsnes';
import type { RoomMode } from './roomService';
import { sendWebRtcSignal, subscribeToSignals, type RoomSignalDoc } from './roomService';
import type { Unsubscribe } from 'firebase/firestore';

export const BUTTON_BITS = [
  Controller.BUTTON_A,      // bit 0
  Controller.BUTTON_B,      // bit 1
  Controller.BUTTON_SELECT, // bit 2
  Controller.BUTTON_START,  // bit 3
  Controller.BUTTON_UP,     // bit 4
  Controller.BUTTON_DOWN,   // bit 5
  Controller.BUTTON_LEFT,   // bit 6
  Controller.BUTTON_RIGHT,  // bit 7
] as const;

export function applyControllerMask(
  nes: NES,
  port: 1 | 2,
  prevMask: number,
  nextMask: number
): number {
  if (prevMask === nextMask) return nextMask;
  const diff = prevMask ^ nextMask;
  for (let i = 0; i < BUTTON_BITS.length; i++) {
    const bit = 1 << i;
    if (diff & bit) {
      if (nextMask & bit) {
        nes.buttonDown(port, BUTTON_BITS[i]);
      } else {
        nes.buttonUp(port, BUTTON_BITS[i]);
      }
    }
  }
  return nextMask;
}

export type NetplayTransportKind = 'disconnected' | 'broadcast' | 'websocket' | 'webrtc';

export interface NetplayCallbacks {
  onTransportChange: (kind: NetplayTransportKind) => void;
  onPingUpdate: (ms: number) => void;
  onP2Input: (mask: number) => void;
  onFrameInputs: (frame: number, p1Mask: number, p2Mask: number) => void;
  onStateSync: (frame: number, state: Record<string, unknown>) => void;
  onRoomControl: (action: 'reset' | 'pause' | 'resume') => void;
  onPeerError?: (message: string) => void;
}

export class NetplayTransport {
  private readonly roomCode: string;
  private readonly role: 'P1' | 'P2';
  private readonly mode: RoomMode;
  private readonly uid: string;
  private readonly hostUid: string;
  private readonly guestUid: string;
  private readonly romHash: string;
  private readonly romRegion: string;
  private readonly displayName: string;
  private readonly callbacks: NetplayCallbacks;

  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private signalUnsub: Unsubscribe | null = null;
  private pingTimer: number | null = null;
  private closed = false;

  private webrtcOpen = false;
  private wsOpen = false;
  private bcActive = false;

  constructor(params: {
    roomCode: string;
    role: 'P1' | 'P2';
    mode: RoomMode;
    uid: string;
    hostUid: string;
    guestUid: string;
    romHash: string;
    romRegion: string;
    displayName: string;
    callbacks: NetplayCallbacks;
  }) {
    this.roomCode = params.roomCode;
    this.role = params.role;
    this.mode = params.mode;
    this.uid = params.uid;
    this.hostUid = params.hostUid;
    this.guestUid = params.guestUid;
    this.romHash = params.romHash;
    this.romRegion = params.romRegion;
    this.displayName = params.displayName;
    this.callbacks = params.callbacks;
  }

  public start(): void {
    if (this.mode === 'local' && typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel(`familink_local_${this.roomCode}`);
      this.bcActive = true;
      this.bc.onmessage = (ev) => {
        if (!ev.data || typeof ev.data !== 'object') return;
        const msg = ev.data as Record<string, unknown>;
        if (msg.__sender === this.uid) return;
        this.handleIncomingPacket(msg);
      };
      this.updateTransportState();
    }

    this.connectWebSocket();

    if (this.mode === 'remote' && this.guestUid) {
      this.setupWebRtc();
    }

    this.pingTimer = window.setInterval(() => {
      this.sendPacket({ type: 'ping', ts: performance.now() });
    }, 2000);
  }

  public notifyHostApproval(approved: boolean, kick = false): void {
    if (this.role !== 'P1') return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'host_access_control',
          approved,
          kick,
        })
      );
    }
  }

  public sendP2Input(mask: number): void {
    if (this.role !== 'P2') return;
    this.sendPacket({ type: 'p2_input', mask });
  }

  public sendFrameInputs(frame: number, p1Mask: number, p2Mask: number): void {
    if (this.role !== 'P1') return;
    this.sendPacket({ type: 'frame_inputs', frame, p1Mask, p2Mask });
  }

  public sendStateSync(frame: number, state: Record<string, unknown>): void {
    if (this.role !== 'P1') return;
    this.sendPacket({ type: 'state_sync', frame, state });
  }

  public sendRoomControl(action: 'reset' | 'pause' | 'resume'): void {
    if (this.role !== 'P1') return;
    this.sendPacket({ type: 'room_control', action });
  }

  private sendPacket(pkt: Record<string, unknown>): void {
    if (this.closed) return;

    // Prefer WebRTC DataChannel if open (lowest P2P latency)
    if (this.webrtcOpen && this.dc && this.dc.readyState === 'open') {
      try {
        this.dc.send(JSON.stringify(pkt));
        return;
      } catch {
        // Fallback below
      }
    }

    // Local mode: BroadcastChannel for same-browser tabs
    if (this.bc && this.bcActive) {
      try {
        this.bc.postMessage({ ...pkt, __sender: this.uid });
      } catch {
        // ignore
      }
    }

    // WebSocket Relay fallback / LAN bridge
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(pkt));
    }
  }

  private connectWebSocket(): void {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws/netplay?roomCode=${encodeURIComponent(this.roomCode)}`;
    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        if (this.closed) {
          ws.close();
          return;
        }
        this.wsOpen = true;
        if (this.role === 'P1') {
          ws.send(
            JSON.stringify({
              type: 'register_host',
              roomCode: this.roomCode,
              romHash: this.romHash,
              romRegion: this.romRegion,
              uid: this.uid,
              name: this.displayName,
            })
          );
        } else {
          ws.send(
            JSON.stringify({
              type: 'join_guest',
              roomCode: this.roomCode,
              romHash: this.romHash,
              romRegion: this.romRegion,
              uid: this.uid,
              name: this.displayName,
            })
          );
        }
        this.updateTransportState();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as Record<string, unknown>;
          this.handleIncomingPacket(msg);
        } catch {
          // ignore malformed packet
        }
      };

      ws.onclose = () => {
        this.wsOpen = false;
        this.updateTransportState();
      };
    } catch {
      this.wsOpen = false;
    }
  }

  private setupWebRtc(): void {
    if (typeof RTCPeerConnection === 'undefined') return;
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    this.pc = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && !this.closed && this.guestUid) {
        void sendWebRtcSignal({
          roomCode: this.roomCode,
          senderUid: this.uid,
          hostUid: this.hostUid,
          guestUid: this.guestUid,
          targetRole: this.role === 'P1' ? 'guest' : 'host',
          type: 'ice',
          payload: JSON.stringify(event.candidate.toJSON()),
        });
      }
    };

    const bindChannel = (channel: RTCDataChannel) => {
      this.dc = channel;
      channel.onopen = () => {
        this.webrtcOpen = true;
        this.updateTransportState();
      };
      channel.onclose = () => {
        this.webrtcOpen = false;
        this.updateTransportState();
      };
      channel.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
          this.handleIncomingPacket(msg);
        } catch {
          // ignore
        }
      };
    };

    if (this.role === 'P1') {
      const dc = pc.createDataChannel('nes-netplay', { ordered: true });
      bindChannel(dc);
      void (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (!this.closed && this.guestUid) {
            await sendWebRtcSignal({
              roomCode: this.roomCode,
              senderUid: this.uid,
              hostUid: this.hostUid,
              guestUid: this.guestUid,
              targetRole: 'guest',
              type: 'offer',
              payload: JSON.stringify(offer),
            });
          }
        } catch {
          // WS relay still active
        }
      })();
    } else {
      pc.ondatachannel = (ev) => {
        bindChannel(ev.channel);
      };
    }

    this.signalUnsub = subscribeToSignals(
      this.roomCode,
      this.uid,
      this.role === 'P1',
      (sig: RoomSignalDoc) => {
        void this.handleSignal(sig);
      }
    );
  }

  private async handleSignal(sig: RoomSignalDoc): Promise<void> {
    if (!this.pc || this.closed) return;
    try {
      const data = JSON.parse(sig.payload) as Record<string, unknown>;
      if (sig.type === 'offer' && this.role === 'P2') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(data as unknown as RTCSessionDescriptionInit));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        await sendWebRtcSignal({
          roomCode: this.roomCode,
          senderUid: this.uid,
          hostUid: this.hostUid,
          guestUid: this.guestUid,
          targetRole: 'host',
          type: 'answer',
          payload: JSON.stringify(answer),
        });
      } else if (sig.type === 'answer' && this.role === 'P1') {
        if (this.pc.signalingState === 'have-local-offer') {
          await this.pc.setRemoteDescription(new RTCSessionDescription(data as unknown as RTCSessionDescriptionInit));
        }
      } else if (sig.type === 'ice') {
        await this.pc.addIceCandidate(new RTCIceCandidate(data as unknown as RTCIceCandidateInit));
      }
    } catch {
      // Non-fatal ICE race, WS relay handles transport
    }
  }

  private handleIncomingPacket(msg: Record<string, unknown>): void {
    const type = String(msg.type || '');
    if (type === 'ping') {
      this.sendPacket({ type: 'pong', ts: msg.ts });
      return;
    }
    if (type === 'pong' && typeof msg.ts === 'number') {
      const rtt = Math.max(1, Math.round(performance.now() - msg.ts));
      this.callbacks.onPingUpdate(rtt);
      return;
    }
    if (type === 'p2_input' && typeof msg.mask === 'number') {
      this.callbacks.onP2Input(msg.mask);
      return;
    }
    if (type === 'frame_inputs' && typeof msg.frame === 'number') {
      this.callbacks.onFrameInputs(
        msg.frame,
        Number(msg.p1Mask || 0),
        Number(msg.p2Mask || 0)
      );
      return;
    }
    if (type === 'state_sync' && typeof msg.frame === 'number' && msg.state && typeof msg.state === 'object') {
      this.callbacks.onStateSync(msg.frame, msg.state as Record<string, unknown>);
      return;
    }
    if (type === 'room_control' && (msg.action === 'reset' || msg.action === 'pause' || msg.action === 'resume')) {
      this.callbacks.onRoomControl(msg.action);
      return;
    }
    if (type === 'error' && typeof msg.message === 'string') {
      this.callbacks.onPeerError?.(msg.message);
    }
  }

  private updateTransportState(): void {
    if (this.webrtcOpen) {
      this.callbacks.onTransportChange('webrtc');
    } else if (this.mode === 'local' && this.bcActive) {
      this.callbacks.onTransportChange('broadcast');
    } else if (this.wsOpen) {
      this.callbacks.onTransportChange('websocket');
    } else {
      this.callbacks.onTransportChange('disconnected');
    }
  }

  public destroy(): void {
    this.closed = true;
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.signalUnsub) {
      this.signalUnsub();
      this.signalUnsub = null;
    }
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
