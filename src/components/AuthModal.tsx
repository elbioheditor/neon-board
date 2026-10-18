import React, { useState } from 'react';
import { X, Lock, Mail, User, Sparkles, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { signInUser, signUpUser, setRememberMePreference } from '../lib/neonAuth';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile, isNewSignup?: boolean) => void;
  isMandatory?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  isMandatory = false,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatarColor, setAvatarColor] = useState('#a855f7');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const colorOptions = ['#a855f7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!username.trim()) {
          setErrorMessage('Por favor, informe seu nome de exibição.');
          setLoading(false);
          return;
        }

        const res = await signUpUser(email, password, username, avatarColor);
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.profile) {
          setRememberMePreference(rememberMe);
          onAuthSuccess(res.profile, true);
          onClose();
        } else {
          setSuccessInfo('Conta criada com sucesso! Você já pode entrar.');
          setMode('signin');
        }
      } else {
        const res = await signInUser(email, password);
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.profile) {
          setRememberMePreference(rememberMe);
          onAuthSuccess(res.profile, false);
          onClose();
        } else {
          setErrorMessage('Perfil não encontrado para este usuário.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0a0715] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/70 p-6 overflow-hidden">
        {/* Glow ambient background accents */}
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/30 to-fuchsia-500/30 border border-cyan-400/50 shadow-md shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                <span>NEON Cloud</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Contas & Amigos
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'signin' ? 'Acesse seu Board e os dos seus amigos' : 'Crie sua conta para ter seu próprio Board'}
              </p>
            </div>
          </div>
          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab switch: Entrar / Criar Conta */}
        <div className="flex p-1 bg-black/50 border border-white/10 rounded-xl mb-4 relative z-10">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white shadow-md shadow-pink-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Conta</span>
          </button>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs relative z-10">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successInfo && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs relative z-10">
            <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Seu Nome / Apelido</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: Elbioh, Didi, Marcos..."
                  className="w-full pl-9 pr-3 py-2 bg-[#05030a] border border-white/15 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Avatar color picker */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-slate-400">Cor do seu avatar:</span>
                <div className="flex items-center gap-1.5">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                        avatarColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full pl-9 pr-3 py-2 bg-[#05030a] border border-white/15 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full pl-9 pr-3 py-2 bg-[#05030a] border border-white/15 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Remember me for 60 days */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/60 text-cyan-400 focus:ring-cyan-400/30 focus:ring-offset-0 transition-colors accent-cyan-400 cursor-pointer"
              />
              <span className="text-xs text-slate-300 group-hover:text-white transition-colors">
                Lembrar neste computador por 60 dias
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processando...' : mode === 'signin' ? 'Acessar Conta' : 'Criar Minha Conta'}
          </button>
        </form>

        {/* Footer */}
        {!isMandatory && (
          <div className="mt-4 pt-3 border-t border-white/10 text-center relative z-10">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] text-slate-400 hover:text-cyan-300 underline cursor-pointer"
            >
              Continuar no Modo Offline (sem login)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
