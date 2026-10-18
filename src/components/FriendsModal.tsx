import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { UserProfile, Friendship } from '../types';
import {
  fetchFriendships,
  sendFriendRequest,
  respondToFriendRequest,
} from '../lib/neonAuth';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSwitchToFriendBoard: (friendName: string) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchToFriendBoard,
}) => {
  const [tab, setTab] = useState<'friends' | 'add' | 'requests'>('friends');
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inputFriendCode, setInputFriendCode] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const loadFriendships = async () => {
    setLoading(true);
    try {
      const list = await fetchFriendships(currentUser.id);
      setFriendships(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFriendships();
      setActionMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');
  const pendingReceived = friendships.filter(
    (f) => f.status === 'pending' && f.friendId === currentUser.id
  );
  const pendingSent = friendships.filter(
    (f) => f.status === 'pending' && f.userId === currentUser.id
  );

  const copyMyCode = () => {
    navigator.clipboard.writeText(currentUser.friendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    if (!inputFriendCode.trim()) return;

    const res = await sendFriendRequest(currentUser.id, inputFriendCode);
    setActionMessage({ text: res.message, isError: !res.success });
    if (res.success) {
      setInputFriendCode('');
      loadFriendships();
    }
  };

  const handleRespond = async (friendshipId: string, accept: boolean) => {
    const res = await respondToFriendRequest(friendshipId, accept);
    if (res.success) {
      loadFriendships();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#0a0715] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/70 p-6 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Glow ambient background accents */}
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 relative z-10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/30 to-fuchsia-500/30 border border-cyan-400/50 shadow-md shadow-cyan-500/20">
              <Users className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                <span>Amigos & Boards Compartilhados</span>
              </h2>
              <p className="text-xs text-slate-400">
                Adicione amigos para visualizar e colaborar no Board deles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User's own friend code box */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-4 flex items-center justify-between relative z-10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs text-white shadow-md"
              style={{ backgroundColor: currentUser.avatarColor || '#a855f7' }}
            >
              {currentUser.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Seu Código de Amigo:</span>
              <span className="text-xs font-mono font-bold text-cyan-300 tracking-wider">
                {currentUser.friendCode}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={copyMyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-200 transition-all cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex p-1 bg-black/50 border border-white/10 rounded-xl mb-4 relative z-10 flex-shrink-0">
          <button
            type="button"
            onClick={() => setTab('friends')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'friends'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Amigos ({acceptedFriends.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('add')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'add'
                ? 'bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white shadow-md shadow-pink-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('requests')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
              tab === 'requests'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pedidos</span>
            {pendingReceived.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center ml-1 animate-pulse">
                {pendingReceived.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 relative z-10 custom-scrollbar">
          {tab === 'friends' && (
            <>
              {acceptedFriends.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <p>Você ainda não tem amigos adicionados.</p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Vá na aba "Adicionar" e cole o código de amigo do seu colega!
                  </p>
                </div>
              ) : (
                acceptedFriends.map((f) => {
                  const friend = f.friendProfile;
                  if (!friend) return null;
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
                          style={{ backgroundColor: friend.avatarColor || '#a855f7' }}
                        >
                          {friend.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {friend.username}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {friend.friendCode}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchToFriendBoard(friend.username);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-400/30 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Ver Board</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespond(f.id, false)}
                          title="Desfazer amizade"
                          className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/30 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === 'add' && (
            <form onSubmit={handleSendRequest} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código de Amigo
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={inputFriendCode}
                    onChange={(e) => setInputFriendCode(e.target.value.toUpperCase())}
                    placeholder="Ex: DIDI#5821"
                    className="flex-1 px-3 py-2 bg-[#05030a] border border-white/15 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-slate-500 uppercase font-mono focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white shadow-md shadow-pink-500/30 hover:opacity-95 transition-all cursor-pointer"
                  >
                    Enviar Pedido
                  </button>
                </div>
              </div>

              {actionMessage && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    actionMessage.isError
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  {actionMessage.text}
                </div>
              )}

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-slate-400 text-xs space-y-1">
                <span className="font-semibold text-purple-300 block">Como funciona?</span>
                <p>1. Peça para o seu amigo copiar o código dele na tela de Amigos.</p>
                <p>2. Cole o código dele acima e clique em Enviar Pedido.</p>
                <p>3. Assim que ele aceitar na aba "Pedidos", o Board dele aparecerá automaticamente na sua barra de boards!</p>
              </div>
            </form>
          )}

          {tab === 'requests' && (
            <div className="space-y-4 pt-1">
              {/* Recebidos */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Pedidos Recebidos ({pendingReceived.length})
                </span>
                {pendingReceived.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">Nenhum pedido recebido pendente.</p>
                ) : (
                  pendingReceived.map((f) => {
                    const friend = f.friendProfile;
                    return (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 mb-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
                            style={{ backgroundColor: friend?.avatarColor || '#a855f7' }}
                          >
                            {friend?.username.slice(0, 2).toUpperCase() || 'AM'}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {friend?.username || 'Usuário'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {friend?.friendCode}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRespond(f.id, true)}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-400/40 transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Aceitar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespond(f.id, false)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-400/40 transition-all cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Recusar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Enviados */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Pedidos Enviados Aguardando Resposta ({pendingSent.length})
                </span>
                {pendingSent.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">Nenhum pedido pendente enviado.</p>
                ) : (
                  pendingSent.map((f) => {
                    const friend = f.friendProfile;
                    return (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 mb-1.5 opacity-80"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-300">
                            {friend?.username || 'Amigo'} ({friend?.friendCode})
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                          Pendente
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
