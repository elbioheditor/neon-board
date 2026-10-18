import React, { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  Calendar,
  Clock,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Download,
  Filter,
  Timer,
} from 'lucide-react';
import { TaskCard, Board } from '../types';
import { LABEL_CONFIG } from '../data/initialData';
import { formatDurationHuman, formatStopwatch } from '../utils/timeUtils';

interface MonthlyHistoryViewProps {
  boards: Board[];
  activeBoardId: string;
  completedCards: TaskCard[];
  onRestoreCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MonthlyHistoryView: React.FC<MonthlyHistoryViewProps> = ({
  boards,
  activeBoardId,
  completedCards,
  onRestoreCard,
  onDeleteCard,
}) => {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [boardFilter, setBoardFilter] = useState<string>(activeBoardId);

  useEffect(() => {
    setBoardFilter(activeBoardId);
  }, [activeBoardId]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentMonthKey]);
    completedCards.forEach((c) => {
      if (c.completedAt) {
        set.add(c.completedAt.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [completedCards, currentMonthKey]);

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    const idx = parseInt(m, 10) - 1;
    return `${MONTH_NAMES[idx] || m} de ${y}`;
  };

  const monthCards = useMemo(() => {
    return completedCards
      .filter((c) => {
        const ym = (c.completedAt || c.createdAt).slice(0, 7);
        const matchesMonth = ym === selectedMonth;
        const matchesBoard = boardFilter === 'all' ? true : c.boardId === boardFilter;
        return matchesMonth && matchesBoard;
      })
      .sort((a, b) =>
        (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt)
      );
  }, [completedCards, selectedMonth, boardFilter]);

  const totalMonthSeconds = useMemo(
    () => monthCards.reduce((acc, c) => acc + (c.elapsedSeconds || 0), 0),
    [monthCards]
  );

  const groupedByDay = useMemo(() => {
    const groups: Record<string, TaskCard[]> = {};
    monthCards.forEach((card) => {
      const dayKey = (card.completedAt || card.createdAt).slice(0, 10);
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(card);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [monthCards]);

  const activeDaysCount = groupedByDay.length;

  const handleExportReport = () => {
    const lines: string[] = [
      `=============================================`,
      `NEON — DALE (${formatMonthLabel(selectedMonth)})`,
      `Total de tarefas finalizadas: ${monthCards.length}`,
      `Tempo total cronometrado: ${formatDurationHuman(totalMonthSeconds)}`,
      `Dias produtivos: ${activeDaysCount}`,
      `=============================================\n`,
    ];

    groupedByDay.forEach(([day, items]) => {
      lines.push(`DIA: ${day} (${items.length} tarefas)`);
      items.forEach((t) => {
        const timeInfo = t.startTime
          ? `[${t.startTime}${t.endTime ? `-${t.endTime}` : ''}] `
          : '';
        const tagInfo = t.categoryTag ? `(${t.categoryTag}) ` : '';
        const trackedInfo =
          t.elapsedSeconds && t.elapsedSeconds > 0
            ? ` | Cronômetro: ${formatStopwatch(t.elapsedSeconds)}`
            : '';
        lines.push(`  ✓ ${timeInfo}${tagInfo}${t.title}${trackedInfo} — (${t.assignee})`);
      });
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Neon-Dale-${selectedMonth}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto px-6 pt-4 pb-28 max-w-6xl mx-auto animate-board-switch">
      {/* Top Banner */}
      <div className="rounded-2xl bg-[#110b22]/95 border border-purple-500/35 p-6 mb-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-fuchsia-600/30 to-cyan-500/30 border border-cyan-400/40 shadow-lg shadow-cyan-500/20">
              <Trophy className="w-6 h-6 text-cyan-300" />
            </div>
            <h2 className="text-2xl font-bold font-display text-white">
              Dale
            </h2>
          </div>

          {/* Month & Board Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-[#090612] px-3 py-1.5 rounded-xl border border-purple-500/30">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {availableMonths.map((ym) => (
                  <option key={ym} value={ym} className="bg-[#0e091c] text-white">
                    {formatMonthLabel(ym)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-[#090612] p-1 rounded-xl border border-purple-500/30">
              <Filter className="w-3.5 h-3.5 text-purple-400 ml-2 mr-1" />
              {boards.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBoardFilter(b.id)}
                  className={`apple-bounce px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    boardFilter === b.id
                      ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-md shadow-fuchsia-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {b.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBoardFilter('all')}
                className={`apple-bounce px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  boardFilter === 'all'
                    ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-md shadow-fuchsia-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportReport}
              className="apple-bounce inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30 text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Relatório</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div
            style={{ animationDelay: '0ms' }}
            className="p-4 rounded-xl bg-[#090612]/80 border border-purple-500/25 animate-spring-pop shadow-lg hover:border-purple-400/40 transition-all duration-300"
          >
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Tarefas Concluídas em {formatMonthLabel(selectedMonth)}
            </span>
            <div className="text-3xl font-extrabold font-display text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-300 mt-1">
              {monthCards.length}
            </div>
          </div>

          <div
            style={{ animationDelay: '80ms' }}
            className="p-4 rounded-xl bg-[#090612]/80 border border-cyan-500/25 animate-spring-pop shadow-lg hover:border-cyan-400/40 transition-all duration-300"
          >
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Tempo Total Cronometrado
            </span>
            <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-1 flex items-center gap-2">
              <Timer className="w-5 h-5 text-fuchsia-400" />
              <span>{formatDurationHuman(totalMonthSeconds)}</span>
            </div>
          </div>

          <div
            style={{ animationDelay: '160ms' }}
            className="p-4 rounded-xl bg-[#090612]/80 border border-fuchsia-500/25 animate-spring-pop shadow-lg hover:border-fuchsia-400/40 transition-all duration-300"
          >
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Dias Produtivos no Mês
            </span>
            <div className="text-2xl font-extrabold font-display text-fuchsia-300 mt-1">
              {activeDaysCount} {activeDaysCount === 1 ? 'dia ativo' : 'dias ativos'}
            </div>
          </div>
        </div>
      </div>

      {/* Completed Tasks List by Day */}
      {groupedByDay.length === 0 ? (
        <div className="rounded-2xl bg-[#0f0a1e]/85 border border-purple-500/20 p-12 text-center">
          <Trophy className="w-12 h-12 text-purple-400/40 mx-auto mb-3" />
          <h3 className="text-lg font-bold font-display text-white mb-1">
            Nenhuma tarefa finalizada neste filtro ainda
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Assim que você marcar qualquer tarefa como <strong>Finalizada</strong>, o cronômetro é
            salvo e ela fica registrada aqui no <strong>Dale</strong>!
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByDay.map(([dayStr, dayCards]) => {
            const [y, m, d] = dayStr.split('-');
            return (
              <div
                key={dayStr}
                className="rounded-2xl bg-[#0f0a1e]/90 border border-purple-500/25 p-5 shadow-xl"
              >
                <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600/30 to-cyan-500/30 border border-cyan-400/30 text-cyan-200 text-xs font-bold">
                      {d}/{m}/{y}
                    </span>
                    <span className="text-xs text-slate-400">
                      {dayCards.length}{' '}
                      {dayCards.length === 1 ? 'tarefa concluída' : 'tarefas concluídas'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {dayCards.map((card) => {
                    const completedTime = card.completedAt
                      ? new Date(card.completedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      : '';
                    return (
                      <div
                        key={card.id}
                        className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#150e28]/90 border border-emerald-500/20 hover:border-cyan-400/40 transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white line-through decoration-cyan-400/60">
                                {card.title}
                              </span>
                              {card.categoryTag && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                                  {card.categoryTag}
                                </span>
                              )}
                              {card.labels.map((c) => (
                                <span
                                  key={c}
                                  className={`w-2.5 h-2.5 rounded-full ${LABEL_CONFIG[c]?.bg}`}
                                />
                              ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                              {(card.startTime || card.endTime) && (
                                <span className="inline-flex items-center gap-1 text-cyan-300 font-mono">
                                  <Clock className="w-3 h-3" />
                                  {card.startTime || '--:--'}
                                  {card.endTime ? ` - ${card.endTime}` : ''}
                                </span>
                              )}
                              {card.elapsedSeconds && card.elapsedSeconds > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 font-mono font-bold">
                                  <Timer className="w-3 h-3 text-cyan-400" />
                                  {formatStopwatch(card.elapsedSeconds)}
                                </span>
                              ) : null}
                              {completedTime && (
                                <span>• Finalizada às {completedTime}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Owner + Restore / Delete */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              card.assignee === 'Elbioh'
                                ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                            }`}
                          >
                            {card.assignee}
                          </span>

                          <button
                            type="button"
                            onClick={() => onRestoreCard(card.id)}
                            title="Devolver tarefa para o Board ativo"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-500/25 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteCard(card.id)}
                            title="Excluir permanentemente"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
