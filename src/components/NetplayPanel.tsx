import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Send,
  LogIn,
  Wifi,
  Users,
  Plus,
  Search,
  Lock,
  Unlock,
  DoorOpen,
} from 'lucide-react';
import {
  REGION_LABELS,
  validateRomMatch,
  type ParsedRom,
} from '../emulator/romUtils';
import {
  createNetplayRoom,
  fetchRoomByCode,
  requestJoinRoom,
  leaveRoomAsGuest,
  hostUpdateGuestAccess,
  hostUpdateRoomSettings,
  closeHostRoom,
  subscribeToWaitingRooms,
  subscribeToRoomMessages,
  sendRoomMessage,
  type NetplayRoomDoc,
  type RoomMessageDoc,
  type RoomMode,
} from '../netplay/roomService';
import type { NetplayTransportKind } from '../netplay/NetplayEngine';

interface NetplayPanelProps {
  mode: RoomMode;
  user: User | null;
  activeRom: ParsedRom | null;
  activeRoom: NetplayRoomDoc | null;
  transportKind: NetplayTransportKind;
  pingMs: number | null;
  initialRoomCode?: string;
  onSignIn: () => void;
  onEnterRoom: (room: NetplayRoomDoc, role: 'P1' | 'P2') => void;
  onExitRoom: () => void;
  onOpenCouch2P: () => void;
  onGoToConsole: () => void;
  onNotifyHostApproval: (approved: boolean, kick?: boolean) => void;
}

export const NetplayPanel: React.FC<NetplayPanelProps> = ({
  mode,
  user,
  activeRom,
  activeRoom,
  transportKind,
  pingMs,
  initialRoomCode = '',
  onSignIn,
  onEnterRoom,
  onExitRoom,
  onOpenCouch2P,
  onGoToConsole,
  onNotifyHostApproval,
}) => {
  const [waitingRooms, setWaitingRooms] = useState<NetplayRoomDoc[]>([]);
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [inspectedRoom, setInspectedRoom] = useState<NetplayRoomDoc | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [messages, setMessages] = useState<RoomMessageDoc[]>([]);
  const [chatText, setChatText] = useState('');

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCodeInput(initialRoomCode);
    }
  }, [initialRoomCode]);

  // Subscribe to waiting rooms when signed in and not inside a room
  useEffect(() => {
    if (!user || activeRoom) {
      setWaitingRooms([]);
      return;
    }
    const unsub = subscribeToWaitingRooms((rooms) => {
      setWaitingRooms(rooms.filter((r) => r.mode === mode && r.hostUid !== user.uid));
    });
    return () => unsub();
  }, [user, activeRoom, mode]);

  // Subscribe to room chat when inside an active room
  useEffect(() => {
    if (!user || !activeRoom) {
      setMessages([]);
      return;
    }
    const isHost = activeRoom.hostUid === user.uid;
    if (!isHost && activeRoom.guestUid !== user.uid) return;

    const unsub = subscribeToRoomMessages(
      activeRoom.roomCode,
      user.uid,
      isHost,
      (msgs) => setMessages(msgs)
    );
    return () => unsub();
  }, [user, activeRoom?.roomCode, activeRoom?.hostUid, activeRoom?.guestUid]);

  const handleCreateRoom = async () => {
    if (!user || !activeRom) return;
    setBusy(true);
    setLookupError(null);
    try {
      const created = await createNetplayRoom({
        hostUid: user.uid,
        hostName: user.displayName || user.email?.split('@')[0] || 'Host P1',
        mode,
        rom: activeRom,
      });
      onEnterRoom(created, 'P1');
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Erro ao criar sala.');
    } finally {
      setBusy(false);
    }
  };

  const handleLookupRoom = async (codeOverride?: string) => {
    const clean = (codeOverride ?? roomCodeInput).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return;
    setBusy(true);
    setLookupError(null);
    setInspectedRoom(null);
    try {
      const found = await fetchRoomByCode(clean);
      if (!found) {
        setLookupError(`Sala "${clean}" não encontrada.`);
      } else if (found.status === 'closed') {
        setLookupError(`A sala "${clean}" já foi encerrada pelo Host.`);
      } else if (found.hostUid === user?.uid) {
        onEnterRoom(found, 'P1');
      } else {
        setInspectedRoom(found);
      }
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Erro ao buscar sala.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestJoin = async (room: NetplayRoomDoc) => {
    if (!user || !activeRom) return;
    const check = validateRomMatch(room.romHash, room.romRegion, activeRom);
    if (!check.ok) {
      setLookupError(check.message);
      return;
    }
    setBusy(true);
    setLookupError(null);
    try {
      await requestJoinRoom({
        roomCode: room.roomCode,
        guestUid: user.uid,
        guestName: user.displayName || user.email?.split('@')[0] || 'Jogador P2',
        guestRom: activeRom,
      });
      onEnterRoom(
        {
          ...room,
          guestUid: user.uid,
          guestName: user.displayName || user.email?.split('@')[0] || 'Jogador P2',
          guestRomHash: activeRom.sha256,
          guestRomRegion: activeRom.region,
          guestAccessStatus: 'pending',
        },
        'P2'
      );
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Erro ao solicitar acesso à sala.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleCopyLink = async (code: string) => {
    const url = `${window.location.origin}/?room=${code}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeRoom || !chatText.trim()) return;
    const isHost = activeRoom.hostUid === user.uid;
    const text = chatText;
    setChatText('');
    await sendRoomMessage({
      roomCode: activeRoom.roomCode,
      senderUid: user.uid,
      hostUid: activeRoom.hostUid,
      guestUid: activeRoom.guestUid,
      senderName: user.displayName || user.email?.split('@')[0] || (isHost ? 'Host P1' : 'Jogador P2'),
      senderRole: isHost ? 'P1' : 'P2',
      text,
    });
  };

  // Active Room View (P1 Host Control Panel or P2 Guest Status)
  if (activeRoom && user) {
    const isHost = activeRoom.hostUid === user.uid;

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-gray-400">
              {activeRoom.mode === 'remote' ? 'Sala Netplay Online (À Distância)' : 'Sala Netplay Local'}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <h2 className="text-2xl font-display font-bold text-white font-mono tracking-wider">
                {activeRoom.roomCode}
              </h2>
              <button
                type="button"
                onClick={() => void handleCopyCode(activeRoom.roomCode)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-xs text-gray-200 cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copiado' : 'Copiar Código'}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleCopyLink(activeRoom.roomCode)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-xs text-gray-200 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copiado' : 'Copiar Link'}</span>
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-1.5 font-mono">
              ROM: {activeRoom.romName} · {REGION_LABELS[activeRoom.romRegion]} · SHA-256 {activeRoom.romHash.slice(0, 12)}…
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onGoToConsole}
              className="px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              Abrir Tela do Jogo
            </button>
            <button
              type="button"
              onClick={async () => {
                if (isHost) {
                  await closeHostRoom(activeRoom.roomCode);
                } else {
                  await leaveRoomAsGuest(activeRoom.roomCode);
                }
                onExitRoom();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-xs font-medium text-gray-200 whitespace-nowrap cursor-pointer"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>{isHost ? 'Encerrar Sala' : 'Sair da Sala'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* P1 Host Access Control + Connection Status */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-semibold text-white">
                  {isHost ? 'Controle de Acesso do P2 (Autoridade do Host P1)' : 'Status de Acesso do Jogador P2'}
                </h3>
                <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-gray-300">
                  <Wifi className={`w-3.5 h-3.5 ${transportKind === 'disconnected' ? 'text-gray-500' : 'text-emerald-400'}`} />
                  <span>
                    {transportKind === 'webrtc' && 'WebRTC P2P'}
                    {transportKind === 'broadcast' && 'Local Broadcast'}
                    {transportKind === 'websocket' && 'Relay WebSocket'}
                    {transportKind === 'disconnected' && 'Conectando…'}
                  </span>
                  {pingMs !== null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{pingMs} ms</span>
                    </>
                  )}
                </div>
              </div>

              {/* Players Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#0F131C] border border-white/10 space-y-1">
                  <div className="text-xs font-medium text-[#E11D48]">Jogador 1 (Host)</div>
                  <div className="text-sm font-semibold text-white truncate">{activeRoom.hostName}</div>
                  <div className="text-xs text-emerald-400">Autorizado · Controle 1</div>
                </div>

                <div className="p-4 rounded-lg bg-[#0F131C] border border-white/10 space-y-1">
                  <div className="text-xs font-medium text-sky-400">Jogador 2 (Convidado)</div>
                  <div className="text-sm font-semibold text-white truncate">
                    {activeRoom.guestUid ? activeRoom.guestName : 'Vaga aberta'}
                  </div>
                  <div className="text-xs">
                    {activeRoom.guestAccessStatus === 'empty' && (
                      <span className="text-gray-400">Aguardando P2 entrar com a mesma ROM</span>
                    )}
                    {activeRoom.guestAccessStatus === 'pending' && (
                      <span className="text-amber-400 font-medium">Aguardando P1 liberar acesso</span>
                    )}
                    {activeRoom.guestAccessStatus === 'approved' && (
                      <span className="text-emerald-400 font-medium">Acesso Liberado · Controle 2 ativo</span>
                    )}
                    {activeRoom.guestAccessStatus === 'denied' && (
                      <span className="text-[#FB7185] font-medium">Acesso bloqueado pelo Host P1</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Host Actions for P2 */}
              {isHost && (
                <div className="pt-2 border-t border-white/10 space-y-4">
                  {activeRoom.guestUid ? (
                    <div className="p-4 rounded-lg bg-[#0F131C] border border-white/10 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span>ROM e Região de {activeRoom.guestName} 100% compatíveis ({activeRoom.romRegion})</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {activeRoom.guestAccessStatus === 'approved'
                            ? 'O P2 está autorizado a enviar comandos no Controle 2 e assistir ao jogo.'
                            : 'Clique em "Liberar Acesso P2" para destravar o Controle 2 e iniciar a partida.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {activeRoom.guestAccessStatus !== 'approved' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await hostUpdateGuestAccess({ roomCode: activeRoom.roomCode, action: 'approve' });
                              onNotifyHostApproval(true, false);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Liberar Acesso P2</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              await hostUpdateGuestAccess({ roomCode: activeRoom.roomCode, action: 'revoke' });
                              onNotifyHostApproval(false, false);
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Pausar Acesso P2</span>
                          </button>
                        )}

                        {activeRoom.guestAccessStatus === 'pending' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await hostUpdateGuestAccess({ roomCode: activeRoom.roomCode, action: 'deny' });
                              onNotifyHostApproval(false, false);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-xs font-medium text-gray-200 whitespace-nowrap cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5 text-[#E11D48]" />
                            <span>Recusar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={async () => {
                            await hostUpdateGuestAccess({ roomCode: activeRoom.roomCode, action: 'kick' });
                            onNotifyHostApproval(false, true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-xs font-medium text-gray-300 whitespace-nowrap cursor-pointer"
                        >
                          <span>Remover P2</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Compartilhe o código <span className="font-mono text-white font-semibold">{activeRoom.roomCode}</span> ou o link de convite com seu amigo. Quando ele entrar com a mesma ROM ({activeRoom.romRegion}), você verá o botão para liberar o acesso dele aqui.
                    </p>
                  )}

                  {/* Input Delay Tuning */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium text-gray-200">Input Delay do Netplay</div>
                      <div className="text-[11px] text-gray-400">
                        Ajuste para compensar latência em conexões à distância (0–6 frames).
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={6}
                        value={activeRoom.inputDelay}
                        onChange={(e) => {
                          void hostUpdateRoomSettings({
                            roomCode: activeRoom.roomCode,
                            inputDelay: Number(e.target.value),
                          });
                        }}
                        className="accent-[#E11D48]"
                      />
                      <span className="text-xs font-mono tabular-nums text-white w-14 text-right">
                        {activeRoom.inputDelay} fr
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* In-Room Chat */}
          <div className="bg-[#12161F] border border-white/10 rounded-xl p-4 flex flex-col h-[340px]">
            <h3 className="text-sm font-semibold text-white pb-3 border-b border-white/10">
              Chat da Sala
            </h3>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-xs">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center mt-8">
                  Nenhuma mensagem ainda. Combine os controles com seu parceiro!
                </p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={m.senderRole === 'P1' ? 'text-[#E11D48] font-bold' : 'text-sky-400 font-bold'}>
                        {m.senderRole}
                      </span>
                      <span className="text-gray-300 font-medium">{m.senderName}</span>
                    </div>
                    <p className="text-gray-200 bg-[#0F131C] border border-white/5 rounded-lg px-2.5 py-1.5 break-words">
                      {m.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="pt-2 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                maxLength={300}
                placeholder="Enviar mensagem..."
                className="flex-1 min-w-0 bg-[#0F131C] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E11D48]"
              />
              <button
                type="submit"
                disabled={!chatText.trim()}
                className="px-3 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] disabled:opacity-40 text-white cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Lobby View (Not in a room yet)
  const inspectedMatch =
    inspectedRoom && activeRom
      ? validateRomMatch(inspectedRoom.romHash, inspectedRoom.romRegion, activeRom)
      : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">
            {mode === 'remote' ? 'Netplay Online à Distância' : 'Netplay Local'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'remote'
              ? 'Jogue à distância via WebRTC P2P e Relay WebSocket. O Host P1 libera o acesso do P2 após verificação de ROM e Região.'
              : 'Jogue em rede local / abas separadas com verificação de ROM ou jogue Local 2P no mesmo computador.'}
          </p>
        </div>

        {mode === 'local' && (
          <button
            type="button"
            onClick={onOpenCouch2P}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#181D29] hover:bg-[#22293A] border border-white/15 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#E11D48]" />
            <span>Jogar Local 2P no Mesmo PC</span>
          </button>
        )}
      </div>

      {/* Require Firebase Email Auth for Netplay Rooms */}
      {!user ? (
        <div className="bg-[#12161F] border border-white/10 rounded-xl p-8 text-center space-y-4">
          <LogIn className="w-10 h-10 text-[#E11D48] mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-white">Entre com sua Conta de E-mail Firebase</h3>
            <p className="text-xs text-gray-400">
              A autenticação via conta Google/E-mail garante identidade única para o Host (P1) liberar o acesso do Jogador 2 (P2) com segurança no Firestore.
            </p>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="px-5 py-2.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-sm font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            Entrar com Conta de E-mail
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Room as P1 Host */}
          <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-white">1. Criar Sala como Host (P1)</h3>
            <p className="text-xs text-gray-400">
              A sala será travada com a assinatura SHA-256 e a Região da ROM carregada no seu console.
            </p>

            {activeRom ? (
              <div className="p-3.5 rounded-lg bg-[#0F131C] border border-white/10 space-y-1.5 text-xs">
                <div className="font-semibold text-white">{activeRom.name}</div>
                <div className="flex flex-wrap items-center gap-2 text-gray-400 font-mono">
                  <span className={activeRom.region === 'JPN' ? 'text-amber-400 font-semibold' : 'text-sky-400 font-semibold'}>
                    {activeRom.regionLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>SHA-256: {activeRom.sha256.slice(0, 14)}…</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-[#E11D48]/10 border border-[#E11D48]/30 text-xs text-[#FB7185]">
                Carregue uma ROM na aba Console antes de criar a sala.
              </div>
            )}

            <div className="text-xs text-gray-400 space-y-1">
              <div>· Japão (NTSC-J) só aceita P2 com ROM do Japão idêntica.</div>
              <div>· EUA (NTSC-U) só aceita P2 com ROM dos EUA idêntica.</div>
              <div>· Você (P1) controla quando liberar ou bloquear o P2.</div>
            </div>

            <button
              type="button"
              disabled={!activeRom || busy}
              onClick={handleCreateRoom}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] disabled:opacity-40 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{busy ? 'Criando Sala...' : 'Criar Sala e Gerar Código P1'}</span>
            </button>
          </div>

          {/* Join Room as P2 Guest */}
          <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-white">2. Entrar como Jogador 2 (P2)</h3>
            <p className="text-xs text-gray-400">
              Digite o código da sala do P1. Verificamos automaticamente se sua ROM e Região são exatamente iguais.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="Código da Sala (ex: NES402)"
                className="flex-1 min-w-0 bg-[#0F131C] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white uppercase placeholder:text-gray-500 focus:outline-none focus:border-[#E11D48]"
              />
              <button
                type="button"
                disabled={!roomCodeInput.trim() || busy}
                onClick={() => void handleLookupRoom()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#181D29] hover:bg-[#22293A] disabled:opacity-40 border border-white/10 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Verificar</span>
              </button>
            </div>

            {lookupError && (
              <div className="p-3 rounded-lg bg-[#E11D48]/10 border border-[#E11D48]/35 text-xs text-[#FB7185] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{lookupError}</span>
              </div>
            )}

            {inspectedRoom && (
              <div className="p-4 rounded-lg bg-[#0F131C] border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">
                    Sala {inspectedRoom.roomCode} · Host: {inspectedRoom.hostName}
                  </span>
                  <span className="text-xs font-mono text-gray-400">{inspectedRoom.romRegion}</span>
                </div>
                <div className="text-xs text-gray-400 font-mono space-y-0.5">
                  <div>ROM da Sala: {inspectedRoom.romName}</div>
                  <div>Região Exigida: {REGION_LABELS[inspectedRoom.romRegion]}</div>
                  <div>Hash Sala: {inspectedRoom.romHash.slice(0, 16)}…</div>
                  {activeRom && (
                    <div>Sua ROM: {activeRom.name} ({REGION_LABELS[activeRom.region]} · {activeRom.sha256.slice(0, 16)}…)</div>
                  )}
                </div>

                {inspectedMatch && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      inspectedMatch.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-[#E11D48]/10 border-[#E11D48]/35 text-[#FB7185]'
                    }`}
                  >
                    {inspectedMatch.ok ? (
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{inspectedMatch.message}</span>
                  </div>
                )}

                {inspectedMatch?.ok && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRequestJoin(inspectedRoom)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Solicitar Acesso P2 na Sala</span>
                  </button>
                )}
              </div>
            )}

            {/* Open Waiting Rooms List */}
            {waitingRooms.length > 0 && (
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="text-xs font-semibold text-gray-300">Salas Abertas ({waitingRooms.length})</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {waitingRooms.map((rm) => {
                    const match = validateRomMatch(rm.romHash, rm.romRegion, activeRom);
                    return (
                      <div
                        key={rm.roomCode}
                        className="p-3 rounded-lg bg-[#0F131C] border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {rm.roomCode} · {rm.romName}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                            Host: {rm.hostName} · {rm.romRegion}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRoomCodeInput(rm.roomCode);
                            setInspectedRoom(rm);
                            setLookupError(null);
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-pointer ${
                            match.ok
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-[#181D29] hover:bg-[#22293A] text-gray-300 border border-white/10'
                          }`}
                        >
                          {match.ok ? 'Compatível' : 'Verificar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
