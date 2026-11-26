import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
  type Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { ParsedRom, RomRegion } from '../emulator/romUtils';
import type { ConsoleId } from '../emulator/coreRegistry';

export type RoomMode = 'remote' | 'local';
export type GuestAccessStatus = 'empty' | 'pending' | 'approved' | 'denied';
export type RoomStatus = 'waiting' | 'playing' | 'paused' | 'closed';

export interface NetplayRoomDoc {
  roomCode: string;
  hostUid: string;
  hostName: string;
  guestUid: string;
  guestName: string;
  mode: RoomMode;
  consoleId: ConsoleId;
  romName: string;
  romHash: string;
  romRegion: RomRegion;
  romSize: number;
  guestRomHash: string;
  guestRomRegion: RomRegion | 'NONE';
  guestAccessStatus: GuestAccessStatus;
  status: RoomStatus;
  inputDelay: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface RoomMessageDoc {
  id: string;
  senderUid: string;
  hostUid: string;
  guestUid: string;
  senderName: string;
  senderRole: 'P1' | 'P2';
  text: string;
  createdAt?: Timestamp;
}

export interface RoomSignalDoc {
  id: string;
  senderUid: string;
  hostUid: string;
  guestUid: string;
  targetRole: 'host' | 'guest';
  type: 'offer' | 'answer' | 'ice';
  payload: string;
  createdAt?: Timestamp;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createNetplayRoom(params: {
  hostUid: string;
  hostName: string;
  mode: RoomMode;
  rom: ParsedRom;
  inputDelay?: number;
}): Promise<NetplayRoomDoc> {
  const roomCode = generateRoomCode();
  const path = `rooms/${roomCode}`;

  const payload: Omit<NetplayRoomDoc, 'createdAt' | 'updatedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
  } = {
    roomCode,
    hostUid: params.hostUid,
    hostName: params.hostName.slice(0, 80) || 'Host P1',
    guestUid: '',
    guestName: '',
    mode: params.mode,
    consoleId: params.rom.consoleId,
    romName: params.rom.name.slice(0, 140),
    romHash: params.rom.sha256,
    romRegion: params.rom.region,
    romSize: params.rom.size,
    guestRomHash: '',
    guestRomRegion: 'NONE',
    guestAccessStatus: 'empty',
    status: 'waiting',
    inputDelay: Math.max(0, Math.min(8, params.inputDelay ?? 1)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'rooms', roomCode), payload);
    return {
      ...payload,
      createdAt: undefined,
      updatedAt: undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchRoomByCode(roomCode: string): Promise<NetplayRoomDoc | null> {
  const clean = roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return null;
  const path = `rooms/${clean}`;
  try {
    const snap = await getDoc(doc(db, 'rooms', clean));
    if (!snap.exists()) return null;
    return snap.data() as NetplayRoomDoc;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function requestJoinRoom(params: {
  roomCode: string;
  guestUid: string;
  guestName: string;
  guestRom: ParsedRom;
}): Promise<void> {
  const path = `rooms/${params.roomCode}`;
  try {
    await updateDoc(doc(db, 'rooms', params.roomCode), {
      guestUid: params.guestUid,
      guestName: params.guestName.slice(0, 80) || 'Jogador P2',
      guestRomHash: params.guestRom.sha256,
      guestRomRegion: params.guestRom.region,
      guestAccessStatus: 'pending',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function leaveRoomAsGuest(roomCode: string): Promise<void> {
  const path = `rooms/${roomCode}`;
  try {
    await updateDoc(doc(db, 'rooms', roomCode), {
      guestUid: '',
      guestName: '',
      guestRomHash: '',
      guestRomRegion: 'NONE',
      guestAccessStatus: 'empty',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function hostUpdateGuestAccess(params: {
  roomCode: string;
  action: 'approve' | 'deny' | 'revoke' | 'kick';
}): Promise<void> {
  const path = `rooms/${params.roomCode}`;
  try {
    if (params.action === 'kick') {
      await updateDoc(doc(db, 'rooms', params.roomCode), {
        guestUid: '',
        guestName: '',
        guestRomHash: '',
        guestRomRegion: 'NONE',
        guestAccessStatus: 'empty',
        status: 'waiting',
        updatedAt: serverTimestamp(),
      });
    } else if (params.action === 'approve') {
      await updateDoc(doc(db, 'rooms', params.roomCode), {
        guestAccessStatus: 'approved',
        status: 'playing',
        updatedAt: serverTimestamp(),
      });
    } else if (params.action === 'revoke') {
      await updateDoc(doc(db, 'rooms', params.roomCode), {
        guestAccessStatus: 'pending',
        status: 'waiting',
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'rooms', params.roomCode), {
        guestAccessStatus: 'denied',
        status: 'waiting',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function hostUpdateRoomSettings(params: {
  roomCode: string;
  status?: RoomStatus;
  inputDelay?: number;
}): Promise<void> {
  const path = `rooms/${params.roomCode}`;
  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (params.status) patch.status = params.status;
  if (typeof params.inputDelay === 'number') {
    patch.inputDelay = Math.max(0, Math.min(8, Math.round(params.inputDelay)));
  }
  try {
    await updateDoc(doc(db, 'rooms', params.roomCode), patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function closeHostRoom(roomCode: string): Promise<void> {
  const path = `rooms/${roomCode}`;
  try {
    await updateDoc(doc(db, 'rooms', roomCode), {
      status: 'closed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToRoom(
  roomCode: string,
  onData: (room: NetplayRoomDoc | null) => void
): Unsubscribe {
  const path = `rooms/${roomCode}`;
  return onSnapshot(
    doc(db, 'rooms', roomCode),
    (snap) => {
      onData(snap.exists() ? (snap.data() as NetplayRoomDoc) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToWaitingRooms(
  onData: (rooms: NetplayRoomDoc[]) => void
): Unsubscribe {
  const path = 'rooms';
  const q = query(
    collection(db, 'rooms'),
    where('status', '==', 'waiting'),
    limit(20)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: NetplayRoomDoc[] = [];
      snap.forEach((d) => {
        list.push(d.data() as NetplayRoomDoc);
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function sendRoomMessage(params: {
  roomCode: string;
  senderUid: string;
  hostUid: string;
  guestUid: string;
  senderName: string;
  senderRole: 'P1' | 'P2';
  text: string;
}): Promise<void> {
  const cleanText = params.text.trim().slice(0, 300);
  if (!cleanText) return;
  const path = `rooms/${params.roomCode}/messages`;
  try {
    await addDoc(collection(db, 'rooms', params.roomCode, 'messages'), {
      senderUid: params.senderUid,
      hostUid: params.hostUid,
      guestUid: params.guestUid,
      senderName: params.senderName.slice(0, 80),
      senderRole: params.senderRole,
      text: cleanText,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToRoomMessages(
  roomCode: string,
  uid: string,
  isHost: boolean,
  onData: (messages: RoomMessageDoc[]) => void
): Unsubscribe {
  const path = `rooms/${roomCode}/messages`;
  const field = isHost ? 'hostUid' : 'guestUid';
  const q = query(
    collection(db, 'rooms', roomCode, 'messages'),
    where(field, '==', uid),
    orderBy('createdAt', 'asc'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => {
      const msgs: RoomMessageDoc[] = [];
      snap.forEach((d) => {
        msgs.push({ id: d.id, ...(d.data() as Omit<RoomMessageDoc, 'id'>) });
      });
      onData(msgs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function sendWebRtcSignal(params: {
  roomCode: string;
  senderUid: string;
  hostUid: string;
  guestUid: string;
  targetRole: 'host' | 'guest';
  type: 'offer' | 'answer' | 'ice';
  payload: string;
}): Promise<void> {
  const path = `rooms/${params.roomCode}/signals`;
  try {
    await addDoc(collection(db, 'rooms', params.roomCode, 'signals'), {
      senderUid: params.senderUid,
      hostUid: params.hostUid,
      guestUid: params.guestUid,
      targetRole: params.targetRole,
      type: params.type,
      payload: params.payload.slice(0, 16384),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToSignals(
  roomCode: string,
  uid: string,
  isHost: boolean,
  onSignal: (sig: RoomSignalDoc) => void
): Unsubscribe {
  const path = `rooms/${roomCode}/signals`;
  const field = isHost ? 'hostUid' : 'guestUid';
  const targetRole = isHost ? 'host' : 'guest';
  const q = query(
    collection(db, 'rooms', roomCode, 'signals'),
    where(field, '==', uid),
    where('targetRole', '==', targetRole),
    limit(50)
  );

  const seen = new Set<string>();
  return onSnapshot(
    q,
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added' && !seen.has(change.doc.id)) {
          seen.add(change.doc.id);
          onSignal({
            id: change.doc.id,
            ...(change.doc.data() as Omit<RoomSignalDoc, 'id'>),
          });
        }
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function clearRoomSignals(roomCode: string, uid: string, isHost: boolean): Promise<void> {
  const path = `rooms/${roomCode}/signals`;
  const field = isHost ? 'hostUid' : 'guestUid';
  try {
    const q = query(collection(db, 'rooms', roomCode, 'signals'), where(field, '==', uid));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    // Non-fatal cleanup
  }
}
