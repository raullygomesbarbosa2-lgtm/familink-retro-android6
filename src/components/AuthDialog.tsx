import React, { useState } from 'react';
import { X, Mail, LockKeyhole, UserPlus, LogIn, KeyRound } from 'lucide-react';
import { createEmailAccount, requestPasswordReset, signInWithEmailPassword } from '../firebase';

type AuthMode = 'login' | 'register' | 'reset';

function authMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : '';
  if (code.includes('email-already-in-use')) return 'Esse e-mail já tem conta. Entre ou recupere a senha.';
  if (code.includes('invalid-email')) return 'Digite um endereço de e-mail válido.';
  if (code.includes('weak-password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'E-mail ou senha incorretos. Confira os dados ou recupere a senha.';
  if (code.includes('too-many-requests')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  if (code.includes('operation-not-allowed')) return 'O Firebase ainda não está habilitado para contas de e-mail e senha.';
  if (code.includes('network-request-failed')) return 'Sem conexão com a internet. Confira a rede e tente novamente.';
  return error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.';
}

interface AuthDialogProps {
  onClose: () => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ onClose }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const title = mode === 'login' ? 'Entrar com e-mail' : mode === 'register' ? 'Criar conta' : 'Recuperar senha';
  const submitLabel = busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar link de recuperação';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (mode !== 'reset' && password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('As senhas não são iguais.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailPassword(email, password);
        onClose();
      } else if (mode === 'register') {
        await createEmailAccount(email, password);
        onClose();
      } else {
        await requestPasswordReset(email);
        setNotice('Se houver uma conta com esse e-mail, o Firebase enviará um link para redefinir a senha. Confira também o spam.');
      }
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="w-full max-w-sm rounded-xl border border-white/10 bg-[#12161F] p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 id="auth-title" className="text-lg font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <label className="block text-xs text-gray-300">
            E-mail
            <span className="relative block mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com"
                className="w-full rounded-lg border border-white/10 bg-[#0F131C] py-3 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#E11D48]" />
            </span>
          </label>

          {mode !== 'reset' && <label className="block text-xs text-gray-300">
            Senha
            <span className="relative block mt-1">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="password" required minLength={6} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                className="w-full rounded-lg border border-white/10 bg-[#0F131C] py-3 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#E11D48]" />
            </span>
          </label>}

          {mode === 'register' && <label className="block text-xs text-gray-300">
            Confirmar senha
            <span className="relative block mt-1">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="password" required minLength={6} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Digite a senha de novo"
                className="w-full rounded-lg border border-white/10 bg-[#0F131C] py-3 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#E11D48]" />
            </span>
          </label>}

          {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}
          {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{notice}</p>}

          <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#E11D48] px-4 py-3 text-sm font-semibold text-white hover:bg-[#BE123C] disabled:opacity-50">
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : mode === 'register' ? <UserPlus className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
            {submitLabel}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-sky-300">
          {mode !== 'login' && <button type="button" onClick={() => { setMode('login'); setError(''); setNotice(''); }} className="underline">Já tenho conta</button>}
          {mode !== 'register' && <button type="button" onClick={() => { setMode('register'); setError(''); setNotice(''); }} className="underline">Criar conta</button>}
          {mode !== 'reset' && <button type="button" onClick={() => { setMode('reset'); setError(''); setNotice(''); }} className="underline">Esqueci a senha</button>}
          {mode === 'reset' && <button type="button" onClick={() => { setMode('login'); setError(''); setNotice(''); }} className="underline">Voltar para entrar</button>}
        </div>
        <p className="mt-4 text-center text-[10px] text-gray-500">A conta é criada com seu e-mail e senha. Não precisa entrar com Google.</p>
      </section>
    </div>
  );
};
