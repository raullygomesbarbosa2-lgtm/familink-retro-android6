import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoomPeer {
  ws: WebSocket;
  uid: string;
  name: string;
  role: 'P1' | 'P2';
}

interface RelayRoom {
  roomCode: string;
  romHash: string;
  romRegion: string;
  hostUid: string;
  p2Approved: boolean;
  p1: RoomPeer | null;
  p2: RoomPeer | null;
}

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  const coreZipCache = new Map<string, Buffer>();
  app.get('/api/cores/:core', async (req, res) => {
    const core = String(req.params.core || '').trim();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(core)) {
      res.status(400).json({ error: 'Nome de núcleo inválido.' });
      return;
    }
    if (/pcsx|psx|ps2|psp|ppsspp|duckstation|swanstation/i.test(core)) {
      res.status(403).json({ error: 'Núcleos Sony não são permitidos.' });
      return;
    }

    const cached = coreZipCache.get(core);
    if (cached) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(cached);
      return;
    }

    const urls = [
      `https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/${core}_libretro.zip`,
      `https://github.com/arianrhodsandlot/retroarch-emscripten-build/raw/v1.22.2/retroarch/${core}_libretro.zip`,
    ];

    for (const url of urls) {
      try {
        const upstream = await fetch(url);
        if (upstream.ok) {
          const buf = Buffer.from(await upstream.arrayBuffer());
          if (buf.length > 100 && buf[0] === 0x50 && buf[1] === 0x4b) {
            coreZipCache.set(core, buf);
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.send(buf);
            return;
          }
        }
      } catch {
        // try next mirror
      }
    }

    res.status(404).json({ error: `Núcleo ${core} não encontrado no servidor de motores.` });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/netplay' });
  const relayRooms = new Map<string, RelayRoom>();

  function sendJson(ws: WebSocket | null | undefined, data: Record<string, unknown>): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    let attachedRoomCode: string | null = null;
    let attachedRole: 'P1' | 'P2' | null = null;
    let attachedUid: string | null = null;

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const initialRoom = (url.searchParams.get('roomCode') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (initialRoom) {
      attachedRoomCode = initialRoom;
    }

    ws.on('message', (raw: Buffer | string) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8')) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'ping') {
        sendJson(ws, { type: 'pong', ts: msg.ts });
        return;
      }

      if (type === 'register_host') {
        const roomCode = String(msg.roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const romHash = String(msg.romHash || '').toLowerCase();
        const romRegion = String(msg.romRegion || '');
        const uid = String(msg.uid || '');
        const name = String(msg.name || 'Host P1').slice(0, 80);

        if (!roomCode || romHash.length !== 64 || !romRegion || !uid) {
          sendJson(ws, { type: 'error', code: 'INVALID_ROOM', message: 'Dados inválidos da sala.' });
          return;
        }

        const existingRoom = relayRooms.get(roomCode);
        const room: RelayRoom = existingRoom && existingRoom.hostUid === uid
          ? existingRoom
          : {
              roomCode,
              romHash,
              romRegion,
              hostUid: uid,
              p2Approved: false,
              p1: null,
              p2: null,
            };

        room.romHash = romHash;
        room.romRegion = romRegion;
        room.p1 = { ws, uid, name, role: 'P1' };
        relayRooms.set(roomCode, room);
        attachedRoomCode = roomCode;
        attachedRole = 'P1';
        attachedUid = uid;

        sendJson(ws, {
          type: 'host_registered',
          roomCode,
          p2Connected: Boolean(room.p2),
          p2Approved: room.p2Approved,
        });
        return;
      }

      if (type === 'join_guest') {
        const roomCode = String(msg.roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const romHash = String(msg.romHash || '').toLowerCase();
        const romRegion = String(msg.romRegion || '');
        const uid = String(msg.uid || '');
        const name = String(msg.name || 'Jogador P2').slice(0, 80);

        const room = relayRooms.get(roomCode);
        if (!room) {
          sendJson(ws, { type: 'error', code: 'ROOM_NOT_FOUND', message: 'Sala não encontrada no servidor Netplay.' });
          return;
        }

        if (romRegion !== room.romRegion) {
          sendJson(ws, {
            type: 'error',
            code: 'REGION_MISMATCH',
            message: `Região incompatível! A sala usa ROM ${room.romRegion}, mas sua ROM é ${romRegion}. Japão só entra com Japão e EUA só entra com EUA.`,
          });
          return;
        }

        if (romHash !== room.romHash) {
          sendJson(ws, {
            type: 'error',
            code: 'HASH_MISMATCH',
            message: 'ROM incompatível! O hash SHA-256 da sua ROM é diferente da ROM do Host P1.',
          });
          return;
        }

        if (room.p2 && room.p2.uid !== uid && room.p2.ws.readyState === WebSocket.OPEN) {
          sendJson(ws, { type: 'error', code: 'ROOM_FULL', message: 'Já existe um Jogador P2 conectado nesta sala.' });
          return;
        }

        room.p2 = { ws, uid, name, role: 'P2' };
        attachedRoomCode = roomCode;
        attachedRole = 'P2';
        attachedUid = uid;

        sendJson(ws, {
          type: 'guest_joined',
          roomCode,
          p2Approved: room.p2Approved,
        });

        sendJson(room.p1?.ws, {
          type: 'p2_connected',
          guestUid: uid,
          guestName: name,
          romHash,
          romRegion,
        });
        return;
      }

      if (!attachedRoomCode) return;
      const room = relayRooms.get(attachedRoomCode);
      if (!room) return;

      if (type === 'host_access_control' && attachedRole === 'P1' && attachedUid === room.hostUid) {
        const approved = Boolean(msg.approved);
        const kick = Boolean(msg.kick);
        room.p2Approved = approved && !kick;
        if (kick && room.p2) {
          sendJson(room.p2.ws, { type: 'kicked', message: 'O Host P1 removeu seu acesso da sala.' });
          room.p2 = null;
        } else if (room.p2) {
          sendJson(room.p2.ws, { type: 'access_status', approved: room.p2Approved });
        }
        return;
      }

      if (attachedRole === 'P1' && (type === 'frame_inputs' || type === 'state_sync' || type === 'room_control')) {
        if (room.p2 && room.p2Approved) {
          sendJson(room.p2.ws, msg);
        }
        return;
      }

      if (attachedRole === 'P2' && type === 'p2_input') {
        if (room.p2Approved && room.p1) {
          sendJson(room.p1.ws, msg);
        }
        return;
      }
    });

    ws.on('close', () => {
      if (!attachedRoomCode) return;
      const room = relayRooms.get(attachedRoomCode);
      if (!room) return;

      if (attachedRole === 'P1' && room.p1?.ws === ws) {
        room.p1 = null;
        if (room.p2) {
          sendJson(room.p2.ws, { type: 'host_disconnected' });
        }
        if (!room.p2) {
          relayRooms.delete(attachedRoomCode);
        }
      } else if (attachedRole === 'P2' && room.p2?.ws === ws) {
        room.p2 = null;
        room.p2Approved = false;
        if (room.p1) {
          sendJson(room.p1.ws, { type: 'p2_disconnected' });
        }
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`FamiLink Netplay server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
