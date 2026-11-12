import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Briefcase,
  DollarSign,
  TrendingUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
} from 'lucide-react';
import { TaskCard, Board, WorkProject } from '../types';
import { LABEL_CONFIG } from '../data/initialData';
import { formatDurationHuman, formatStopwatch } from '../utils/timeUtils';
import {
  formatUsd,
  formatBrl,
  getProjectTotalSeconds,
  getProjectMonthKey,
} from './ProjectsView';

interface MonthlyHistoryViewProps {
  boards: Board[];
  activeBoardId: string;
  completedCards: TaskCard[];
  allCards?: TaskCard[];
  projects?: WorkProject[];
  nowMs?: number;
  usdToBrlRate?: number;
  onRestoreCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onRestoreProject?: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => void;
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

const MONTH_SHORT_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export const MonthlyHistoryView: React.FC<MonthlyHistoryViewProps> = ({
  boards,
  activeBoardId,
  completedCards,
  allCards = [],
  projects = [],
  nowMs = Date.now(),
  usdToBrlRate = 5.8,
  onRestoreCard,
  onDeleteCard,
  onRestoreProject,
  onDeleteProject,
}) => {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [boardFilter, setBoardFilter] = useState<string>(activeBoardId);
  const [showGraphs, setShowGraphs] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    parseInt(currentMonthKey.slice(0, 4), 10) || now.getFullYear()
  );
  const [hoveredMonthData, setHoveredMonthData] = useState<{
    monthIndex: number;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    setBoardFilter(activeBoardId);
  }, [activeBoardId]);

  useEffect(() => {
    const yr = parseInt(selectedMonth.slice(0, 4), 10);
    if (!isNaN(yr)) {
      setSelectedYear(yr);
    }
  }, [selectedMonth]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentMonthKey]);
    completedCards.forEach((c) => {
      if (c.completedAt) {
        set.add(c.completedAt.slice(0, 7));
      }
    });
    projects.forEach((p) => {
      const ym = getProjectMonthKey(p);
      if (ym) set.add(ym);
    });
    return Array.from(set).sort().reverse();
  }, [completedCards, projects, currentMonthKey]);

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    const idx = parseInt(m, 10) - 1;
    return `${MONTH_NAMES[idx] || m} de ${y}`;
  };

  const monthCards = useMemo(() => {
    return completedCards
      .filter((c) => {
        // If it's a part-based routine task ('days_count' or 'specific_days'), require all parts to be completed
        if (
          (c.recurrence?.mode === 'days_count' || c.recurrence?.mode === 'specific_days') &&
          c.recurrence.groupId &&
          allCards.length > 0
        ) {
          const groupCards = allCards.filter(
            (item) => item.recurrence?.groupId === c.recurrence?.groupId
          );
          if (groupCards.length > 0 && !groupCards.every((item) => item.status === 'completed')) {
            return false;
          }
        }
        const ym = (c.completedAt || c.createdAt).slice(0, 7);
        const matchesMonth = ym === selectedMonth;
        const matchesBoard = boardFilter === 'all' ? true : c.boardId === boardFilter;
        return matchesMonth && matchesBoard;
      })
      .sort((a, b) =>
        (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt)
      );
  }, [completedCards, allCards, selectedMonth, boardFilter]);

  const totalMonthSeconds = useMemo(
    () => monthCards.reduce((acc, c) => acc + (c.elapsedSeconds || 0), 0),
    [monthCards]
  );

  const monthCompletedProjects = useMemo(() => {
    const completedInMonth = projects.filter((p) => {
      if (p.status !== 'completed') return false;
      const ym = getProjectMonthKey(p);
      const matchesMonth = ym === selectedMonth;
      const matchesBoard =
        boardFilter === 'all' ? true : p.boardId === boardFilter;
      return matchesMonth && matchesBoard;
    });
    const sourceList =
      completedInMonth.length > 0
        ? completedInMonth
        : projects.filter((p) => {
            const ym = getProjectMonthKey(p);
            const matchesMonth = ym === selectedMonth;
            const matchesBoard =
              boardFilter === 'all' ? true : p.boardId === boardFilter;
            return matchesMonth && matchesBoard;
          });
    return sourceList.sort((a, b) =>
      (b.completedAt || b.createdAt).localeCompare(
        a.completedAt || a.createdAt
      )
    );
  }, [projects, selectedMonth, boardFilter]);

  // 12-Month Yearly Bar Chart Data for the "Graphs" tab
  const yearlyMonthsData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, mIdx) => {
      const mm = String(mIdx + 1).padStart(2, '0');
      const ym = `${selectedYear}-${mm}`;

      const mProjects = projects
        .filter((p) => {
          const matchesBoard =
            boardFilter === 'all' ? true : p.boardId === boardFilter;
          return matchesBoard && getProjectMonthKey(p) === ym;
        })
        .sort((a, b) =>
          (b.completedAt || b.createdAt).localeCompare(
            a.completedAt || a.createdAt
          )
        );

      const mCards = completedCards.filter((c) => {
        const matchesBoard =
          boardFilter === 'all' ? true : c.boardId === boardFilter;
        return (
          matchesBoard && (c.completedAt || c.createdAt).slice(0, 7) === ym
        );
      });

      const earnedUsd = mProjects.reduce(
        (acc, p) => acc + (Number(p.amountUsd) || 0),
        0
      );
      const earnedBrl = earnedUsd * usdToBrlRate;

      const projectSeconds = mProjects.reduce(
        (acc, p) => acc + getProjectTotalSeconds(p, allCards, nowMs),
        0
      );
      const taskSeconds = mCards.reduce(
        (acc, c) => acc + (c.elapsedSeconds || 0),
        0
      );
      const totalSeconds = projectSeconds > 0 ? projectSeconds : taskSeconds;
      const hoursFloat = totalSeconds / 3600;
      const avgHourlyUsd = hoursFloat > 0 ? earnedUsd / hoursFloat : 0;
      const avgHourlyBrl = avgHourlyUsd * usdToBrlRate;

      // Group clients for this month
      const clientMap = new Map<
        string,
        { clientName: string; count: number; totalUsd: number }
      >();
      mProjects.forEach((p) => {
        const cName = (p.clientName || 'Brody').trim() || 'Brody';
        const key = cName.toLowerCase();
        const existing = clientMap.get(key) || {
          clientName: cName,
          count: 0,
          totalUsd: 0,
        };
        existing.count += 1;
        existing.totalUsd += Number(p.amountUsd) || 0;
        clientMap.set(key, existing);
      });

      const clientsBreakdown = Array.from(clientMap.values()).sort(
        (a, b) => b.totalUsd - a.totalUsd
      );

      return {
        monthIndex: mIdx,
        ym,
        monthName: MONTH_NAMES[mIdx],
        shortName: MONTH_SHORT_NAMES[mIdx],
        projects: mProjects,
        tasksCount: mCards.length,
        earnedUsd,
        earnedBrl,
        totalSeconds,
        avgHourlyUsd,
        avgHourlyBrl,
        clientsBreakdown,
      };
    });

    const maxMonthUsd = Math.max(...months.map((m) => m.earnedUsd), 1);
    const yearTotalUsd = months.reduce((acc, m) => acc + m.earnedUsd, 0);
    const yearTotalBrl = yearTotalUsd * usdToBrlRate;
    const yearTotalProjects = months.reduce(
      (acc, m) => acc + m.projects.length,
      0
    );
    const yearTotalSeconds = months.reduce((acc, m) => acc + m.totalSeconds, 0);
    const yearAvgHourlyUsd =
      yearTotalSeconds > 0 ? yearTotalUsd / (yearTotalSeconds / 3600) : 0;
    const yearAvgHourlyBrl = yearAvgHourlyUsd * usdToBrlRate;

    const yearClientsSet = new Set<string>();
    months.forEach((m) =>
      m.clientsBreakdown.forEach((cl) => yearClientsSet.add(cl.clientName))
    );

    return {
      months,
      maxMonthUsd,
      yearTotalUsd,
      yearTotalBrl,
      yearTotalProjects,
      yearTotalSeconds,
      yearAvgHourlyUsd,
      yearAvgHourlyBrl,
      yearClients: Array.from(yearClientsSet),
    };
  }, [
    projects,
    completedCards,
    allCards,
    nowMs,
    selectedYear,
    boardFilter,
    usdToBrlRate,
  ]);

  const monthProjectStats = useMemo(() => {
    const earnedUsd = monthCompletedProjects.reduce(
      (acc, p) => acc + (Number(p.amountUsd) || 0),
      0
    );
    const earnedBrl = earnedUsd * usdToBrlRate;
    const projectSeconds = monthCompletedProjects.reduce(
      (acc, p) => acc + getProjectTotalSeconds(p, allCards, nowMs),
      0
    );
    const hoursForRate =
      projectSeconds > 0 ? projectSeconds / 3600 : totalMonthSeconds / 3600;
    const avgHourlyUsd = hoursForRate > 0 ? earnedUsd / hoursForRate : 0;
    const avgHourlyBrl = avgHourlyUsd * usdToBrlRate;
    return {
      earnedUsd,
      earnedBrl,
      projectSeconds,
      avgHourlyUsd,
      avgHourlyBrl,
    };
  }, [
    monthCompletedProjects,
    allCards,
    nowMs,
    usdToBrlRate,
    totalMonthSeconds,
  ]);

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
      `Projetos concluídos no mês: ${monthCompletedProjects.length}`,
      `Ganhos no mês (USD): ${formatUsd(monthProjectStats.earnedUsd)}`,
      `Ganhos no mês (Convertido BRL): ${formatBrl(monthProjectStats.earnedBrl)} (Cotação R$ ${usdToBrlRate.toFixed(2)})`,
      `Valor da Hora Média: ${formatUsd(monthProjectStats.avgHourlyUsd)}/h (${formatBrl(monthProjectStats.avgHourlyBrl)}/h)`,
      `Tempo total cronometrado: ${formatDurationHuman(totalMonthSeconds)}`,
      `Dias produtivos: ${activeDaysCount}`,
      `=============================================\n`,
    ];

    if (monthCompletedProjects.length > 0) {
      lines.push(`PROJETOS CONCLUÍDOS NO MÊS (${monthCompletedProjects.length}):`);
      monthCompletedProjects.forEach((p) => {
        const pSecs = getProjectTotalSeconds(p, allCards, nowMs);
        lines.push(
          `  ★ ${p.title} [Cliente: ${p.clientName || 'Brody'}] — ${formatUsd(p.amountUsd || 0)} (${formatBrl((p.amountUsd || 0) * usdToBrlRate)}) | Horas no projeto: ${formatStopwatch(pSecs)}`
        );
      });
      lines.push('');
    }

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
            {/* Graphs Button (to the left of the chosen month) */}
            <button
              type="button"
              onClick={() => setShowGraphs((v) => !v)}
              className={`apple-bounce inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showGraphs
                  ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white border-cyan-300/60 shadow-lg shadow-cyan-500/25'
                  : 'bg-[#090612] text-cyan-300 border-purple-500/35 hover:border-cyan-400/60 hover:text-white'
              }`}
              title="Ver gráfico de barras de ganhos por mês no ano"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Graphs</span>
            </button>

            <div className="flex items-center gap-2 bg-[#090612] px-3 py-1.5 rounded-xl border border-purple-500/30">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setShowGraphs(false);
                }}
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

        {/* Financial & Projects Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/35 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-300 uppercase tracking-wider font-semibold">
                Ganhos no Mês (USD + Convertido)
              </span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-300 mt-1">
              {formatUsd(monthProjectStats.earnedUsd)}
            </div>
            <div className="text-xs font-mono font-bold text-emerald-200/90 mt-0.5">
              {formatBrl(monthProjectStats.earnedBrl)}{' '}
              <span className="text-[10px] text-slate-400 font-sans">
                (US$ 1 = R$ {usdToBrlRate.toFixed(2)})
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/25 border border-cyan-500/35 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-cyan-300 uppercase tracking-wider font-semibold">
                Valor da Hora Média do Usuário
              </span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-1">
              {formatUsd(monthProjectStats.avgHourlyUsd)}
              <span className="text-xs font-normal text-cyan-400/80"> /h</span>
            </div>
            <div className="text-xs font-mono font-bold text-cyan-200/90 mt-0.5">
              {formatBrl(monthProjectStats.avgHourlyBrl)} /h
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-950/25 border border-purple-500/35 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-300 uppercase tracking-wider font-semibold">
                Projetos Finalizados no Mês
              </span>
              <Briefcase className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-purple-200 mt-1">
              {monthCompletedProjects.length}{' '}
              <span className="text-xs font-sans font-normal text-slate-400">
                projeto(s)
              </span>
            </div>
            <div className="text-xs font-mono text-purple-300/90 mt-0.5">
              Horas em projetos:{' '}
              {formatDurationHuman(monthProjectStats.projectSeconds)}
            </div>
          </div>
        </div>
      </div>

      {/* GRAPHS VIEW: Annual Bar Chart by Month with Rich Hover Tooltip */}
      {showGraphs && (
        <div className="rounded-2xl bg-[#0f0a1e]/95 border border-cyan-500/40 p-6 mb-6 shadow-2xl space-y-5 animate-drawer-open">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600/30 to-cyan-500/30 border border-cyan-400/40">
                <BarChart3 className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Graphs — Ganhos por Mês ({selectedYear})
                </h3>
                <p className="text-xs text-slate-400">
                  Passe o mouse em cima de qualquer mês para ver projetos
                  feitos, hora média de ganhos e clientes daquele mês!
                </p>
              </div>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2 bg-[#090612] px-3 py-1.5 rounded-xl border border-purple-500/35">
              <button
                type="button"
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-purple-500/20 transition-colors cursor-pointer"
                title="Ano anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-extrabold font-mono text-cyan-300 min-w-[60px] text-center">
                {selectedYear}
              </span>
              <button
                type="button"
                onClick={() => setSelectedYear((y) => y + 1)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-purple-500/20 transition-colors cursor-pointer"
                title="Próximo ano"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Yearly Summary Mini-KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                Total Ganho em {selectedYear}
              </span>
              <div className="text-xl font-extrabold font-mono text-emerald-300 mt-0.5">
                {formatUsd(yearlyMonthsData.yearTotalUsd)}
              </div>
              <div className="text-xs font-mono text-emerald-200/85">
                {formatBrl(yearlyMonthsData.yearTotalBrl)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-950/25 border border-cyan-500/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 block">
                Hora Média no Ano
              </span>
              <div className="text-xl font-extrabold font-mono text-cyan-300 mt-0.5">
                {formatUsd(yearlyMonthsData.yearAvgHourlyUsd)}
                <span className="text-xs font-normal text-cyan-400/80">/h</span>
              </div>
              <div className="text-xs font-mono text-cyan-200/85">
                {formatBrl(yearlyMonthsData.yearAvgHourlyBrl)}/h
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-950/25 border border-purple-500/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                Projetos Feitos em {selectedYear}
              </span>
              <div className="text-xl font-extrabold font-mono text-purple-200 mt-0.5">
                {yearlyMonthsData.yearTotalProjects}
              </div>
              <div className="text-xs font-mono text-purple-300/85">
                ⏱ {formatDurationHuman(yearlyMonthsData.yearTotalSeconds)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-fuchsia-950/25 border border-fuchsia-500/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 block">
                Clientes do Ano ({yearlyMonthsData.yearClients.length})
              </span>
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {yearlyMonthsData.yearClients.length === 0 ? (
                  <span className="text-xs text-slate-400">—</span>
                ) : (
                  yearlyMonthsData.yearClients.map((cl) => (
                    <span
                      key={cl}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-bold text-cyan-200"
                    >
                      <User className="w-2.5 h-2.5" />
                      {cl}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 12-Month Bar Chart */}
          <div className="p-5 rounded-2xl bg-[#090612]/90 border border-purple-500/25">
            <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end h-64 pt-8 pb-2">
              {yearlyMonthsData.months.map((m) => {
                const heightPct =
                  m.earnedUsd > 0
                    ? Math.max(
                        14,
                        Math.round(
                          (m.earnedUsd / yearlyMonthsData.maxMonthUsd) * 100
                        )
                      )
                    : 5;
                const isHovered = hoveredMonthData?.monthIndex === m.monthIndex;
                const isCurrentSelected = m.ym === selectedMonth;

                return (
                  <div
                    key={m.ym}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredMonthData({ monthIndex: m.monthIndex, rect });
                    }}
                    onMouseLeave={() => setHoveredMonthData(null)}
                    onClick={() => {
                      setSelectedMonth(m.ym);
                    }}
                    className="group relative h-full flex flex-col items-center justify-end cursor-pointer select-none"
                  >
                    {/* Value above bar */}
                    <div
                      className={`mb-1.5 text-center transition-all ${
                        m.earnedUsd > 0
                          ? 'opacity-100'
                          : 'opacity-40 group-hover:opacity-90'
                      }`}
                    >
                      <div
                        className={`text-[10px] sm:text-[11px] font-mono font-extrabold ${
                          m.earnedUsd > 0
                            ? 'text-emerald-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {m.earnedUsd > 0 ? formatUsd(m.earnedUsd) : '$0'}
                      </div>
                      {m.earnedUsd > 0 && (
                        <div className="text-[9px] font-mono text-cyan-300/85 hidden md:block">
                          {formatBrl(m.earnedBrl)}
                        </div>
                      )}
                    </div>

                    {/* Bar track & fill */}
                    <div className="w-full max-w-[44px] h-40 bg-white/[0.03] rounded-t-xl border border-white/5 flex items-end p-0.5 overflow-hidden">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          m.earnedUsd > 0
                            ? isHovered
                              ? 'bg-gradient-to-t from-purple-500 via-cyan-400 to-emerald-300 shadow-[0_0_24px_rgba(6,182,212,0.75)] scale-y-[1.02]'
                              : 'bg-gradient-to-t from-purple-600 via-fuchsia-500 to-cyan-400 shadow-[0_0_15px_rgba(168,85,247,0.45)]'
                            : isHovered
                              ? 'bg-purple-500/40'
                              : 'bg-white/10'
                        }`}
                      />
                    </div>

                    {/* Month short label & project count */}
                    <div
                      className={`mt-2 text-center px-1.5 py-0.5 rounded-lg transition-colors ${
                        isHovered || isCurrentSelected
                          ? 'bg-purple-500/30 text-white font-extrabold'
                          : 'text-slate-400 font-semibold'
                      }`}
                    >
                      <div className="text-[11px]">{m.shortName}</div>
                      {m.projects.length > 0 && (
                        <div className="text-[9px] font-mono text-cyan-300">
                          {m.projects.length} proj
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Rich Hover Tooltip (rendered via Portal so it never clips) */}
          {hoveredMonthData !== null &&
            (() => {
              const m = yearlyMonthsData.months[hoveredMonthData.monthIndex];
              if (!m) return null;
              const tooltipWidth = 340;
              const viewportW =
                typeof window !== 'undefined' ? window.innerWidth : 1280;
              const rawLeft =
                hoveredMonthData.rect.left +
                hoveredMonthData.rect.width / 2 -
                tooltipWidth / 2;
              const clampedLeft = Math.max(
                12,
                Math.min(rawLeft, viewportW - tooltipWidth - 12)
              );
              const placeBelow = hoveredMonthData.rect.top < 270;
              const topPos = placeBelow
                ? hoveredMonthData.rect.bottom + 10
                : Math.max(12, hoveredMonthData.rect.top - 10);

              return createPortal(
                <div
                  style={{
                    position: 'fixed',
                    left: `${clampedLeft}px`,
                    top: `${topPos}px`,
                    transform: placeBelow ? 'none' : 'translateY(-100%)',
                    width: `${tooltipWidth}px`,
                  }}
                  className="z-[9999] pointer-events-none p-4 rounded-2xl bg-[#0e091d]/98 border border-cyan-400/60 shadow-[0_16px_50px_rgba(0,0,0,0.92),0_0_30px_rgba(6,182,212,0.3)] backdrop-blur-2xl space-y-3"
                >
                  {/* Header: Month & Total Earnings */}
                  <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                        {m.monthName} de {selectedYear}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {m.projects.length} projeto(s) • {m.tasksCount} tarefa(s)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-extrabold text-emerald-300">
                        {formatUsd(m.earnedUsd)}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-400/90">
                        {formatBrl(m.earnedBrl)}
                      </div>
                    </div>
                  </div>

                  {/* Average Hourly Rate & Total Hours */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/50 border border-white/10">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                        Hora Média de Ganhos
                      </span>
                      <span className="text-xs font-mono font-extrabold text-cyan-300">
                        {m.avgHourlyUsd > 0
                          ? `${formatUsd(m.avgHourlyUsd)}/h`
                          : '—'}
                      </span>
                      {m.avgHourlyBrl > 0 && (
                        <span className="text-[10px] font-mono text-cyan-400/80 block">
                          {formatBrl(m.avgHourlyBrl)}/h
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                        Horas Trabalhadas
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        ⏱ {formatStopwatch(m.totalSeconds)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {formatDurationHuman(m.totalSeconds)}
                      </span>
                    </div>
                  </div>

                  {/* Clients of the Month */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center gap-1">
                      <Users className="w-3 h-3 text-cyan-400" />
                      Clientes Daquele Mês ({m.clientsBreakdown.length})
                    </div>
                    {m.clientsBreakdown.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic">
                        Nenhum cliente registrado neste mês.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {m.clientsBreakdown.map((cl) => (
                          <div
                            key={cl.clientName}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-[11px]"
                          >
                            <User className="w-3 h-3 text-cyan-300" />
                            <span className="font-bold text-white">
                              {cl.clientName}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-300">
                              ({cl.count}x • {formatUsd(cl.totalUsd)})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Projects Done in the Month */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-1.5 flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-emerald-400" />
                      Projetos Feitos no Mês ({m.projects.length})
                    </div>
                    {m.projects.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic">
                        Nenhum projeto neste mês.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-hidden">
                        {m.projects.slice(0, 6).map((p) => {
                          const pSecs = getProjectTotalSeconds(
                            p,
                            allCards,
                            nowMs
                          );
                          return (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/5 text-[11px]"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">
                                  {p.title}
                                </div>
                                <div className="text-[10px] text-cyan-300 flex items-center gap-1.5">
                                  <span>👤 {p.clientName || 'Brody'}</span>
                                  <span>• ⏱ {formatDurationHuman(pSecs)}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-emerald-300">
                                  {formatUsd(p.amountUsd || 0)}
                                </div>
                                <div className="text-[9px] font-mono text-emerald-400/80">
                                  {formatBrl(
                                    (p.amountUsd || 0) * usdToBrlRate
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              );
            })()}
        </div>
      )}

      {/* Completed Projects in the Month Section */}
      {monthCompletedProjects.length > 0 && (
        <div className="rounded-2xl bg-[#0f0a1e]/90 border border-emerald-500/30 p-5 mb-6 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Projetos Concluídos no Fim do Mês ({monthCompletedProjects.length})
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-300">
              {formatUsd(monthProjectStats.earnedUsd)} •{' '}
              {formatBrl(monthProjectStats.earnedBrl)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {monthCompletedProjects.map((proj) => {
              const pSecs = getProjectTotalSeconds(proj, allCards, nowMs);
              const pHours = pSecs / 3600;
              const pRateUsd = pHours > 0 ? (proj.amountUsd || 0) / pHours : 0;
              return (
                <div
                  key={proj.id}
                  className="p-3.5 rounded-xl bg-[#150e28]/90 border border-emerald-500/25 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-sm font-bold text-white truncate">
                        {proj.title}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-[10px] font-bold text-cyan-300">
                        <User className="w-2.5 h-2.5" />
                        {proj.clientName || 'Brody'}
                      </span>
                    </div>
                    {proj.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {proj.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-cyan-300">
                      <span>⏱ {formatStopwatch(pSecs)}</span>
                      {pRateUsd > 0 && (
                        <span className="text-emerald-300">
                          • {formatUsd(pRateUsd)}/h
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-extrabold text-emerald-300">
                      {formatUsd(proj.amountUsd || 0)}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-400/85">
                      {formatBrl((proj.amountUsd || 0) * usdToBrlRate)}
                    </div>
                    {onRestoreProject && (
                      <button
                        type="button"
                        onClick={() => onRestoreProject(proj.id)}
                        className="mt-1 text-[10px] text-slate-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        Reativar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-purple-500/20 text-purple-300 border-purple-400/40"
                          >
                            {card.assignee || 'Criador'}
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
