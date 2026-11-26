import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Unlock, Lock, Wifi, ShieldCheck, DoorOpen } from 'lucide-react';
import { auth, logoutUser, syncUserProfile } from './firebase';
import { AuthDialog } from './components/AuthDialog';
import { REGION_LABELS, type ParsedRom } from './emulator/romUtils';
import { restoreMobileRom, saveMobileRom } from './emulator/mobileSession';
import {
  subscribeToRoom,
  fetchRoomByCode,
  hostUpdateGuestAccess,
  closeHostRoom,
  leaveRoomAsGuest,
  type NetplayRoomDoc,
} from './netplay/roomService';
import { NetplayTransport, type NetplayTransportKind } from './netplay/NetplayEngine';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar, type ActiveTab } from './components/Navbar';
import type { BiosFileItem, PlayMode } from './components/EmulatorViewport';
const EmulatorViewport = lazy(() => import('./components/EmulatorViewport').then((m) => ({ default: m.EmulatorViewport })));
const RomLibraryPanel = lazy(() => import('./components/RomLibraryPanel').then((m) => ({ default: m.RomLibraryPanel })));
const NetplayPanel = lazy(() => import('./components/NetplayPanel').then((m) => ({ default: m.NetplayPanel })));
const ControlsGuide = lazy(() => import('./components/ControlsGuide').then((m) => ({ default: m.ControlsGuide })));
const CoresAndDownloadsPanel = lazy(() => import('./components/CoresAndDownloadsPanel').then((m) => ({ default: m.CoresAndDownloadsPanel })));
const AndroidSdkPanel = lazy(() => import('./components/AndroidSdkPanel').then((m) => ({ default: m.AndroidSdkPanel })));
import type { BluetoothGamepadConfig } from './emulator/inputManager';

function AppContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('console');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const [activeRom, setActiveRom] = useState<ParsedRom | null>(null);
  const [biosFiles, setBiosFiles] = useState<BiosFileItem[]>([]);
  const [localPlayMode, setLocalPlayMode] = useState<'solo' | 'couch-2p'>('solo');
  const [showControlsGuide, setShowControlsGuide] = useState(false);
  const [btConfig, setBtConfig] = useState<BluetoothGamepadConfig>({
    p1PadIndex: -1,
    p2PadIndex: -1,
    swapFaceButtons: false,
    deadzone: 0.35,
  });

  const [activeRoom, setActiveRoom] = useState<NetplayRoomDoc | null>(null);
  const [roomRole, setRoomRole] = useState<'P1' | 'P2' | null>(null);
  const [transportKind, setTransportKind] = useState<NetplayTransportKind>('disconnected');
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [initialInviteCode, setInitialInviteCode] = useState('');

  const transportRef = useRef<NetplayTransport | null>(null);
  const mobileResumeTabRef = useRef<'remote' | 'local' | null>(null);
  const mobileRestoreDoneRef = useRef(false);
  const [transportInstance, setTransportInstance] = useState<NetplayTransport | null>(null);

  const isAndroid6Phone = typeof navigator !== 'undefined' && /Android 6\.0/i.test(navigator.userAgent);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get('room') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const mobileTab = params.get('mobileTab');
    if (mobileTab === 'remote' || mobileTab === 'local') {
      mobileResumeTabRef.current = mobileTab;
      setActiveTab(mobileTab);
      params.delete('mobileTab');
      const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
      window.history.replaceState(null, '', cleanUrl);
    }
    if (code) {
      setInitialInviteCode(code);
      setActiveTab('remote');
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        void syncUserProfile(u);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (authLoading || mobileRestoreDoneRef.current || !mobileResumeTabRef.current) return;
    let hasSavedRoom = false;
    try { hasSavedRoom = Boolean(sessionStorage.getItem('familink_mobile_room_resume')); } catch { /* session storage optional */ }
    if (hasSavedRoom && !user) return;
    mobileRestoreDoneRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const restoredRom = await restoreMobileRom();
        if (!cancelled && restoredRom) setActiveRom(restoredRom);
      } catch {
        if (!cancelled) setStatusToast('Não consegui restaurar a ROM nesta sessão. Recarregue a ROM pela aba Console.');
      }
      if (cancelled) return;
      try {
        const savedRoom = sessionStorage.getItem('familink_mobile_room_resume');
        if (savedRoom && user) {
          const info = JSON.parse(savedRoom) as { roomCode?: string; role?: 'P1' | 'P2' };
          if (info.roomCode && (info.role === 'P1' || info.role === 'P2')) {
            const room = await fetchRoomByCode(info.roomCode);
            if (room && room.status !== 'closed' &&
              ((info.role === 'P1' && room.hostUid === user.uid) || (info.role === 'P2' && room.guestUid === user.uid))) {
              if (!cancelled) {
                setActiveRoom(room);
                setRoomRole(info.role);
              }
            }
          }
        }
        sessionStorage.removeItem('familink_mobile_room_resume');
      } catch {
        if (!cancelled) setStatusToast('A sala não pôde ser restaurada. Volte ao lobby e entre pelo código da sala.');
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user?.uid]);

  useEffect(() => {
    if (!statusToast) return;
    const t = window.setTimeout(() => setStatusToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [statusToast]);

  useEffect(() => {
    if (!activeRoom?.roomCode || !user) return;
    const unsub = subscribeToRoom(activeRoom.roomCode, (updated) => {
      if (!updated || updated.status === 'closed') {
        setStatusToast('A sala Netplay foi encerrada.');
        setActiveRoom(null);
        setRoomRole(null);
        return;
      }
      if (roomRole === 'P2' && updated.guestUid !== user.uid) {
        setStatusToast('O Host P1 removeu você da sala.');
        setActiveRoom(null);
        setRoomRole(null);
        return;
      }
      setActiveRoom(updated);
    });
    return () => unsub();
  }, [activeRoom?.roomCode, user?.uid, roomRole]);

  useEffect(() => {
    if (!activeRoom || !roomRole || !user) {
      transportRef.current?.destroy();
      transportRef.current = null;
      setTransportInstance(null);
      setTransportKind('disconnected');
      setPingMs(null);
      return;
    }

    const transport = new NetplayTransport({
      roomCode: activeRoom.roomCode,
      role: roomRole,
      mode: activeRoom.mode,
      uid: user.uid,
      hostUid: activeRoom.hostUid,
      guestUid: activeRoom.guestUid,
      romHash: activeRoom.romHash,
      romRegion: activeRoom.romRegion,
      displayName: user.displayName || user.email?.split('@')[0] || roomRole,
      callbacks: {
        onTransportChange: (kind) => setTransportKind(kind),
        onPingUpdate: (ms) => setPingMs(ms),
        onP2Input: () => {},
        onFrameInputs: () => {},
        onStateSync: () => {},
        onRoomControl: () => {},
        onPeerError: (msg) => setStatusToast(msg),
      },
    });

    transport.start();
    transportRef.current = transport;
    setTransportInstance(transport);

    return () => {
      transport.destroy();
      if (transportRef.current === transport) {
        transportRef.current = null;
        setTransportInstance(null);
      }
    };
  }, [
    activeRoom?.roomCode,
    activeRoom?.guestUid,
    activeRoom?.mode,
    roomRole,
    user?.uid,
  ]);

  const handleSelectTab = (tab: ActiveTab) => {
    if (isAndroid6Phone && activeTab === 'console' && (tab === 'remote' || tab === 'local')) {
      void (async () => {
        try {
          await saveMobileRom(activeRom);
          if (activeRoom && roomRole) {
            sessionStorage.setItem('familink_mobile_room_resume', JSON.stringify({ roomCode: activeRoom.roomCode, role: roomRole }));
          } else {
            sessionStorage.removeItem('familink_mobile_room_resume');
          }
          const url = new URL(window.location.href);
          url.searchParams.set('mobileTab', tab);
          window.location.replace(url.toString());
        } catch {
          setStatusToast('O celular não conseguiu liberar memória com segurança. O jogo e a sala foram mantidos abertos.');
        }
      })();
      return;
    }
    setActiveTab(tab);
  };

  const handleSignIn = () => {
    setAuthError(null);
    setShowAuthDialog(true);
  };

  const handleSignOut = async () => {
    if (activeRoom && user) {
      if (activeRoom.hostUid === user.uid) {
        await closeHostRoom(activeRoom.roomCode);
      } else {
        await leaveRoomAsGuest(activeRoom.roomCode);
      }
    }
    setActiveRoom(null);
    setRoomRole(null);
    await logoutUser();
  };

  const handleEnterRoom = (room: NetplayRoomDoc, role: 'P1' | 'P2') => {
    setActiveRoom(room);
    setRoomRole(role);
    setStatusToast(
      role === 'P1'
        ? `Sala ${room.roomCode} criada! Aguarde o P2 entrar para liberar o acesso.`
        : `Solicitação enviada para a sala ${room.roomCode}. Aguarde o Host P1 liberar seu acesso.`
    );
  };

  const handleExitRoom = () => {
    setActiveRoom(null);
    setRoomRole(null);
  };

  const effectivePlayMode: PlayMode =
    activeRoom && roomRole === 'P1'
      ? 'netplay-host'
      : activeRoom && roomRole === 'P2'
        ? 'netplay-guest'
        : localPlayMode;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F3F4F6] flex flex-col">
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        user={user}
        authLoading={authLoading}
        onSignIn={() => void handleSignIn()}
        onSignOut={() => void handleSignOut()}
      />

      {(authError || statusToast) && (
        <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="px-4 py-2.5 rounded-lg bg-[#181D29] border border-white/15 text-xs text-gray-200 flex items-center justify-between gap-4">
            <span>{authError || statusToast}</span>
            <button
              type="button"
              onClick={() => {
                setAuthError(null);
                setStatusToast(null);
              }}
              className="text-gray-400 hover:text-white text-xs cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 max-w-[1400px] w-full mx-auto px-2 sm:px-6 py-3 sm:py-6">
        <Suspense fallback={<div className="min-h-[30vh] flex items-center justify-center text-sm text-gray-400">Abrindo tela…</div>}>
        {activeTab === 'console' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8">
                <EmulatorViewport
                  rom={activeRom}
                  biosFiles={biosFiles}
                  playMode={effectivePlayMode}
                  guestAccessStatus={activeRoom?.guestAccessStatus ?? 'empty'}
                  netplayTransport={transportInstance}
                  inputDelay={activeRoom?.inputDelay ?? 1}
                  btConfig={btConfig}
                  onStatusMessage={(msg) => setStatusToast(msg)}
                  onToggleControlsGuide={() => setShowControlsGuide((v) => !v)}
                />
              </div>

              <div className="lg:col-span-4 space-y-6">
                {activeRoom && user && (
                  <div className="bg-[#12161F] border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-white font-mono">
                        Sala {activeRoom.roomCode} · {roomRole}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-gray-300">
                        <Wifi className={`w-3.5 h-3.5 ${transportKind === 'disconnected' ? 'text-gray-500' : 'text-emerald-400'}`} />
                        <span>{pingMs !== null ? `${pingMs} ms` : transportKind}</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400">
                      ROM: {activeRoom.romName} · {REGION_LABELS[activeRoom.romRegion]}
                    </div>

                    {roomRole === 'P1' ? (
                      <div className="space-y-2.5 pt-2 border-t border-white/10">
                        {activeRoom.guestUid ? (
                          <>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                P2: {activeRoom.guestName} (ROM verificada)
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {activeRoom.guestAccessStatus !== 'approved' ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await hostUpdateGuestAccess({ roomCode: activeRoom.roomCode, action: 'approve' });
                                    transportRef.current?.notifyHostApproval(true, false);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Liberar Acesso P2</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await hostUpdateGuestAccess({ roomCode: activeRoom.roomCode, action: 'revoke' });
                                    transportRef.current?.notifyHostApproval(false, false);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Pausar P2</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setActiveTab(activeRoom.mode)}
                                className="px-3 py-2 rounded-lg bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-xs text-gray-200 cursor-pointer whitespace-nowrap"
                              >
                                Gerenciar Sala
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-400">Aguardando P2 entrar...</span>
                            <button
                              type="button"
                              onClick={() => setActiveTab(activeRoom.mode)}
                              className="text-xs text-[#E11D48] hover:underline cursor-pointer"
                            >
                              Ver Sala / Chat
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-300">
                          {activeRoom.guestAccessStatus === 'approved'
                            ? 'P2 Liberado · Controle 2 ativo'
                            : 'Aguardando P1 liberar seu acesso'}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await leaveRoomAsGuest(activeRoom.roomCode);
                            handleExitRoom();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-xs text-gray-200 cursor-pointer"
                        >
                          <DoorOpen className="w-3.5 h-3.5" />
                          <span>Sair</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <RomLibraryPanel
                  activeRom={activeRom}
                  biosFiles={biosFiles}
                  playMode={effectivePlayMode}
                  inNetplayRoom={Boolean(activeRoom)}
                  onSelectRom={(rom) => {
                    setActiveRom(rom);
                    if (rom) {
                      setStatusToast(`ROM carregada: ${rom.name} (${rom.consoleName} · ${rom.regionLabel})`);
                    } else {
                      setStatusToast('Cartucho ejetado.');
                    }
                  }}
                  onAddBiosFiles={(added) => {
                    setBiosFiles((prev) => {
                      const map = new Map(prev.map((b) => [b.name.toLowerCase(), b]));
                      for (const item of added) {
                        map.set(item.name.toLowerCase(), item);
                      }
                      return Array.from(map.values());
                    });
                    setStatusToast(`BIOS carregada: ${added.map((b) => b.name).join(', ')}`);
                  }}
                  onClearBiosFiles={() => {
                    setBiosFiles([]);
                    setStatusToast('Arquivos BIOS removidos.');
                  }}
                  onSelectLocalMode={(m) => setLocalPlayMode(m)}
                  onOpenCoresTab={() => setActiveTab('cores')}
                />
              </div>
            </div>

            {showControlsGuide && (
              <div className="pt-2 border-t border-white/10">
                <ControlsGuide btConfig={btConfig} onChangeBtConfig={setBtConfig} />
              </div>
            )}
          </div>
        )}

        {(activeTab === 'remote' || activeTab === 'local') && (
          <NetplayPanel
            mode={activeTab === 'remote' ? 'remote' : 'local'}
            user={user}
            activeRom={activeRom}
            activeRoom={activeRoom}
            transportKind={transportKind}
            pingMs={pingMs}
            initialRoomCode={initialInviteCode}
            onSignIn={() => void handleSignIn()}
            onEnterRoom={handleEnterRoom}
            onExitRoom={handleExitRoom}
            onOpenCouch2P={() => {
              setLocalPlayMode('couch-2p');
              setActiveTab('console');
            }}
            onGoToConsole={() => setActiveTab('console')}
            onNotifyHostApproval={(approved, kick) =>
              transportRef.current?.notifyHostApproval(approved, kick)
            }
          />
        )}

        {activeTab === 'cores' && <CoresAndDownloadsPanel />}

        {activeTab === 'android' && <AndroidSdkPanel />}
        </Suspense>
      </main>
      {showAuthDialog && <AuthDialog onClose={() => setShowAuthDialog(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
