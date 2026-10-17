import React, { useState } from 'react';
import { Inbox, Plus, ArrowRightCircle, Trash2, Sparkles } from 'lucide-react';
import { Board } from '../types';

interface InboxNote {
  id: string;
  boardId: string;
  text: string;
  createdAt: string;
}

interface InboxViewProps {
  board: Board;
  notes: InboxNote[];
  onAddNote: (text: string) => void;
  onConvertToCard: (noteId: string, startTime?: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export const InboxView: React.FC<InboxViewProps> = ({
  board,
  notes,
  onAddNote,
  onConvertToCard,
  onDeleteNote,
}) => {
  const [text, setText] = useState('');
  const [quickTime, setQuickTime] = useState('10:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddNote(text.trim());
    setText('');
  };

  return (
    <div className="h-full overflow-y-auto px-6 pt-4 pb-28 max-w-4xl mx-auto">
      <div className="rounded-2xl bg-[#110b22]/95 border border-purple-500/30 p-6 mb-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/30">
            <Inbox className="w-6 h-6 text-fuchsia-300" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Captura Rápida de Ideias • {board.name}</span>
            </div>
            <h2 className="text-xl font-bold font-display text-white">
              Inbox & Rascunhos Rápidos
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2.5">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Anote uma ideia rápida, vídeo pra editar ou tarefa futura..."
            className="flex-1 bg-[#090612] border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-95 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Salvar Ideia</span>
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="rounded-2xl bg-[#0e091c]/80 border border-white/10 p-10 text-center text-xs text-slate-400">
            Sua Inbox está limpa! Use o campo acima para anotar ideias sem poluir o Board principal.
          </div>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-4 rounded-xl bg-[#130d26]/90 border border-purple-500/25 hover:border-cyan-400/40 transition-all"
            >
              <p className="text-sm text-slate-100 flex-1">{n.text}</p>

              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                  className="bg-[#090612] border border-cyan-500/30 rounded-lg px-2 py-1 text-xs text-cyan-300 font-mono"
                  title="Horário ao enviar para Today"
                />
                <button
                  type="button"
                  onClick={() => onConvertToCard(n.id, quickTime)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-xs font-bold transition-colors cursor-pointer"
                >
                  <ArrowRightCircle className="w-3.5 h-3.5" />
                  <span>Enviar p/ Today</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteNote(n.id)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
