import React, { useState } from 'react';
import JSZip from 'jszip';
import { Download, FileCode2, Smartphone, ShieldCheck, Copy, Check } from 'lucide-react';
import { ANDROID_SDK_PROJECT_FILES } from '../android/androidProjectFiles';
import { FIREBASE_PROJECT_INFO } from '../firebase';

export const AndroidSdkPanel: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState(ANDROID_SDK_PROJECT_FILES[0].path);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedFile =
    ANDROID_SDK_PROJECT_FILES.find((f) => f.path === selectedPath) ||
    ANDROID_SDK_PROJECT_FILES[0];

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      for (const file of ANDROID_SDK_PROJECT_FILES) {
        zip.file(file.path, file.content);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FamiLink-Android-SDK-NoWebView.zip';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyFile = async () => {
    await navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-[#12161F] border border-white/10 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Smartphone className="w-4 h-4" />
            <span>Android SDK Nativo · Zero WebView · NDK JNI + SurfaceView + AudioTrack</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Projeto Android Nativo (Sem WebView)
          </h2>
          <p className="text-xs text-gray-300">
            Ao abrir qualquer ROM no Android, o app usa <code className="text-white">ActivityResultContracts.OpenDocument()</code>,
            renderiza diretamente em <code className="text-white">android.view.SurfaceView</code> + <code className="text-white">android.graphics.Canvas</code> (com seletor <code className="text-white">30 FPS / 60 FPS</code>),
            reproduz som via <code className="text-white">AudioTrack</code> e executa os motores nativos (.so) direto via JNI C++ — sem RetroArch e sem <code className="text-white">WebView</code>.
          </p>
        </div>

        <button
          type="button"
          disabled={downloading}
          onClick={() => void handleDownloadZip()}
          className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] disabled:opacity-50 text-xs font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Gerando ZIP...' : 'Baixar Projeto Android SDK (.zip)'}</span>
        </button>
      </div>

      {/* Firebase Android Binding Note */}
      <div className="bg-[#12161F] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            Conectado ao mesmo banco Firestore (<span className="font-mono text-white">{FIREBASE_PROJECT_INFO.firestoreDatabaseId}</span>) e Auth do projeto <span className="font-mono text-white">{FIREBASE_PROJECT_INFO.projectId}</span>, permitindo cross-play Android ↔ Web.
          </span>
        </div>
        <span className="font-mono text-gray-400">minSdk 26 · targetSdk 35</span>
      </div>

      {/* Source File Explorer + Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-[#12161F] border border-white/10 rounded-xl p-3 space-y-1">
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">
            Arquivos do Projeto ({ANDROID_SDK_PROJECT_FILES.length})
          </div>
          {ANDROID_SDK_PROJECT_FILES.map((file) => {
            const active = file.path === selectedFile.path;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedPath(file.path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                  active
                    ? 'bg-[#E11D48]/15 border border-[#E11D48]/50 text-white font-semibold'
                    : 'text-gray-300 hover:bg-[#181D29] border border-transparent'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span className="truncate font-mono">{file.path}</span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-8 bg-[#12161F] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-mono font-semibold text-white truncate">
                {selectedFile.path}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {selectedFile.description}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyFile()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#22293A] border border-white/10 text-xs text-gray-200 cursor-pointer whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar Código'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-200 overflow-x-auto max-h-[540px] leading-relaxed bg-[#0B0E14]">
            <code>{selectedFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
