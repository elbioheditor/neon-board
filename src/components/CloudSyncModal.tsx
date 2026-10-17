import React, { useState } from 'react';
import {
  X,
  Cloud,
  Copy,
  Check,
  Download,
  Upload,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { CloudConfig } from '../lib/cloudSync';
import { NeonStoreState } from '../types';

interface CloudSyncModalProps {
  config: CloudConfig;
  syncStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  state: NeonStoreState;
  onSaveConfig: (cfg: CloudConfig) => void;
  onImportState: (newState: NeonStoreState) => void;
  onForceSync: () => void;
  onClose: () => void;
}

const SUPABASE_SQL_SNIPPET = `create table if not exists public.neon_sync (
  room_key text primary key,
  state jsonb not null,
  updated_at timestamptz default now()
);
alter table public.neon_sync enable row level security;
create policy "allow_all_neon" on public.neon_sync for all using (true) with check (true);
alter publication supabase_realtime add table public.neon_sync;`;

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  config,
  syncStatus,
  state,
  onSaveConfig,
  onImportState,
  onForceSync,
  onClose,
}) => {
  const [url, setUrl] = useState(config.supabaseUrl);
  const [anonKey, setAnonKey] = useState(config.supabaseAnonKey);
  const [enabled, setEnabled] = useState(config.enabled);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      supabaseUrl: url.trim(),
      supabaseAnonKey: anonKey.trim(),
      enabled,
    });
  };

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SNIPPET);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Neon-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        if (parsed && parsed.boards && parsed.cards) {
          onImportState(parsed);
          onClose();
        }
      } catch {
        alert('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0e091c] border border-cyan-500/35 shadow-2xl p-6 text-slate-100"
      >
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30">
              <Cloud className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-white">
                Sincronização Online (Elbioh & Didi)
              </h3>
              <p className="text-xs text-slate-400">
                Sincronize em tempo real entre dois PCs ou pela Vercel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#150f29] border border-purple-500/25 mb-5">
          <div className="flex items-center gap-2.5">
            {syncStatus === 'connected' ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-xs font-semibold">
              Status da Nuvem:{' '}
              <strong
                className={
                  syncStatus === 'connected'
                    ? 'text-emerald-400'
                    : syncStatus === 'connecting'
                    ? 'text-amber-300'
                    : syncStatus === 'error'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }
              >
                {syncStatus === 'connected'
                  ? 'Conectado em Tempo Real'
                  : syncStatus === 'connecting'
                  ? 'Conectando...'
                  : syncStatus === 'error'
                  ? 'Erro de Conexão (Verifique URL/Key)'
                  : 'Modo Local (Salvo neste PC)'}
              </strong>
            </span>
          </div>

          {syncStatus === 'connected' && (
            <button
              type="button"
              onClick={onForceSync}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/30"
            >
              <RefreshCw className="w-3 h-3" />
              Sincronizar Agora
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4 mb-6">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded accent-cyan-400"
            />
            <span className="text-xs font-semibold text-slate-200">
              Ativar Sincronização em Tempo Real via Supabase (Grátis)
            </span>
          </label>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Supabase Project URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seu-projeto.supabase.co"
              className="w-full bg-[#090612] border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Supabase Anon Public Key</label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
              className="w-full bg-[#090612] border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#090612] border border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-cyan-300">
                SQL para criar a tabela no Supabase:
              </span>
              <button
                type="button"
                onClick={copySql}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 text-[10px] font-bold hover:bg-purple-500/30"
              >
                {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedSql ? 'Copiado!' : 'Copiar SQL'}
              </button>
            </div>
            <pre className="text-[10px] text-slate-400 overflow-x-auto font-mono leading-relaxed">
              {SUPABASE_SQL_SNIPPET}
            </pre>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-opacity cursor-pointer"
          >
            Salvar Configuração de Nuvem
          </button>
        </form>

        {/* Backup Local JSON */}
        <div className="pt-4 border-t border-white/10">
          <span className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Backup Manual (Exportar / Importar Arquivo)
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-cyan-300 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Backup (.json)</span>
            </button>

            <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-fuchsia-300 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Importar Backup (.json)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
