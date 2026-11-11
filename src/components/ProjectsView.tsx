import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  DollarSign,
  Clock,
  Plus,
  CheckCircle2,
  Trash2,
  Edit3,
  RefreshCw,
  TrendingUp,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  Link2,
  Unlink,
  ArrowDownCircle,
} from 'lucide-react';
import { TaskCard, WorkProject } from '../types';
import {
  formatDurationHuman,
  formatStopwatch,
  getBrasiliaYearMonth,
  getLiveElapsedSeconds,
} from '../utils/timeUtils';

export function formatUsd(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatBrl(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function getProjectTotalSeconds(
  project: WorkProject,
  allCards: TaskCard[],
  nowMs: number
): number {
  const linkedSeconds = allCards
    .filter((c) => c.projectId === project.id)
    .reduce((acc, c) => acc + getLiveElapsedSeconds(c, nowMs), 0);
  return (project.manualSeconds || 0) + linkedSeconds;
}

export function getProjectMonthKey(project: WorkProject): string {
  if (project.status === 'completed' && project.completedAt) {
    return project.completedAt.slice(0, 7);
  }
  return (project.createdAt || '').slice(0, 7) || getBrasiliaYearMonth();
}

const PROJECT_COLORS = [
  '#a855f7',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#3b82f6',
  '#f43f5e',
];

const MONTH_NAMES_PT = [
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

interface ProjectsViewProps {
  boardId: string;
  boardName: string;
  projects: WorkProject[];
  cards: TaskCard[];
  nowMs: number;
  usdToBrlRate: number;
  onUpdateUsdToBrlRate: (rate: number) => void;
  onCreateProject: (data: {
    title: string;
    description?: string;
    amountUsd: number;
    color?: string;
  }) => void;
  onUpdateProject: (updated: WorkProject) => void;
  onCompleteProject: (projectId: string) => void;
  onRestoreProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onAssignCardProject: (cardId: string, projectId: string | undefined) => void;
  onProjectDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    projectId: string
  ) => void;
  onProjectDragEnd: () => void;
  draggedProjectId: string | null;
  readOnly?: boolean;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  boardId,
  boardName,
  projects,
  cards,
  nowMs,
  usdToBrlRate,
  onUpdateUsdToBrlRate,
  onCreateProject,
  onUpdateProject,
  onCompleteProject,
  onRestoreProject,
  onDeleteProject,
  onAssignCardProject,
  onProjectDragStart,
  onProjectDragEnd,
  draggedProjectId,
  readOnly = false,
}) => {
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() =>
    getBrasiliaYearMonth()
  );

  // New project form state
  const [newTitle, setNewTitle] = useState('');
  const [newAmountUsd, setNewAmountUsd] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  // Editing project state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmountUsd, setEditAmountUsd] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState(PROJECT_COLORS[0]);

  // Linking existing task popover state
  const [linkingProjectId, setLinkingProjectId] = useState<string | null>(null);

  // Exchange rate live fetch & edit state
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(usdToBrlRate || 5.8));

  useEffect(() => {
    setRateInput(String(usdToBrlRate || 5.8));
  }, [usdToBrlRate]);

  const fetchLiveUsdBrlRate = async () => {
    setIsFetchingRate(true);
    try {
      const res = await fetch(
        'https://economia.awesomeapi.com.br/json/last/USD-BRL'
      );
      if (res.ok) {
        const data = await res.json();
        const bid = parseFloat(data?.USDBRL?.bid);
        if (!isNaN(bid) && bid > 1) {
          const rounded = Math.round(bid * 100) / 100;
          onUpdateUsdToBrlRate(rounded);
        }
      }
    } catch {
      // Keep current/fallback rate if offline
    } finally {
      setIsFetchingRate(false);
    }
  };

  useEffect(() => {
    fetchLiveUsdBrlRate();
  }, []);

  const boardProjects = useMemo(
    () => projects.filter((p) => p.boardId === boardId),
    [projects, boardId]
  );

  const boardCards = useMemo(
    () => cards.filter((c) => c.boardId === boardId),
    [cards, boardId]
  );

  const activeProjects = useMemo(
    () => boardProjects.filter((p) => p.status === 'active'),
    [boardProjects]
  );

  const completedProjectsForMonth = useMemo(
    () =>
      boardProjects
        .filter(
          (p) =>
            p.status === 'completed' &&
            getProjectMonthKey(p) === selectedYearMonth
        )
        .sort((a, b) =>
          (b.completedAt || '').localeCompare(a.completedAt || '')
        ),
    [boardProjects, selectedYearMonth]
  );

  // Monthly financial & time metrics
  const monthlyMetrics = useMemo(() => {
    // Completed projects in selected month
    const completedUsd = completedProjectsForMonth.reduce(
      (acc, p) => acc + (Number(p.amountUsd) || 0),
      0
    );
    const completedBrl = completedUsd * usdToBrlRate;

    const completedSeconds = completedProjectsForMonth.reduce(
      (acc, p) => acc + getProjectTotalSeconds(p, boardCards, nowMs),
      0
    );

    // Active projects currently in progress
    const activeUsd = activeProjects.reduce(
      (acc, p) => acc + (Number(p.amountUsd) || 0),
      0
    );
    const activeBrl = activeUsd * usdToBrlRate;

    const activeSeconds = activeProjects.reduce(
      (acc, p) => acc + getProjectTotalSeconds(p, boardCards, nowMs),
      0
    );

    // Total earned in the month:
    // Completed projects in the month are realized earnings; we also compute combined totals
    const totalSecondsInMonth = completedSeconds + activeSeconds;
    const totalHoursCompleted = completedSeconds / 3600;
    const totalHoursAll = totalSecondsInMonth / 3600;

    // Average hourly rate ($/h and R$/h):
    // If there are completed projects with tracked hours in the month, use completedUsd / totalHoursCompleted;
    // otherwise if the user has active projects with tracked hours, calculate live hourly rate across projects with tracked time
    let avgHourlyUsd = 0;
    if (completedUsd > 0 && totalHoursCompleted > 0) {
      avgHourlyUsd = completedUsd / totalHoursCompleted;
    } else if (totalHoursAll > 0) {
      const projectsWithHoursUsd = [...completedProjectsForMonth, ...activeProjects]
        .filter((p) => getProjectTotalSeconds(p, boardCards, nowMs) > 0)
        .reduce((acc, p) => acc + (Number(p.amountUsd) || 0), 0);
      avgHourlyUsd = projectsWithHoursUsd / totalHoursAll;
    }
    const avgHourlyBrl = avgHourlyUsd * usdToBrlRate;

    return {
      completedUsd,
      completedBrl,
      completedSeconds,
      activeUsd,
      activeBrl,
      activeSeconds,
      totalSecondsInMonth,
      avgHourlyUsd,
      avgHourlyBrl,
    };
  }, [
    completedProjectsForMonth,
    activeProjects,
    boardCards,
    nowMs,
    usdToBrlRate,
  ]);

  const handlePrevMonth = () => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const dt = new Date(y, m - 2, 1);
    setSelectedYearMonth(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleNextMonth = () => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const dt = new Date(y, m, 1);
    setSelectedYearMonth(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const formattedMonthLabel = useMemo(() => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    return `${MONTH_NAMES_PT[(m || 1) - 1]} ${y}`;
  }, [selectedYearMonth]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const parsedUsd = parseFloat(newAmountUsd.replace(',', '.')) || 0;
    onCreateProject({
      title: trimmed,
      description: newDescription.trim() || undefined,
      amountUsd: Math.max(0, parsedUsd),
      color: newColor,
    });
    setNewTitle('');
    setNewAmountUsd('');
    setNewDescription('');
    setIsCreating(false);
  };

  const startEditing = (project: WorkProject) => {
    if (readOnly) return;
    setEditingId(project.id);
    setEditTitle(project.title);
    setEditAmountUsd(String(project.amountUsd || 0));
    setEditDescription(project.description || '');
    setEditColor(project.color || PROJECT_COLORS[0]);
  };

  const saveEdit = (project: WorkProject) => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    const parsedUsd = parseFloat(editAmountUsd.replace(',', '.')) || 0;
    onUpdateProject({
      ...project,
      title: trimmed,
      description: editDescription.trim() || undefined,
      amountUsd: Math.max(0, parsedUsd),
      color: editColor,
    });
    setEditingId(null);
  };

  return (
    <div className="h-full overflow-y-auto pr-1 pb-24 space-y-5">
      {/* Top Header & Month Selector + USD/BRL Rate */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-purple-500/25 bg-[#0d091a]/80 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/30 to-cyan-500/30 border border-purple-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.25)]">
            <Briefcase className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Projetos & Ganhos — {boardName}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                USD $ + BRL R$
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Vincule tarefas aos seus projetos para somar as horas trabalhadas e
              arraste o projeto para baixo ao concluir!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Live USD -> BRL Exchange Rate Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-emerald-500/30 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 text-[11px]">Cotação USD:</span>
            {isEditingRate ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-16 px-1.5 py-0.5 rounded bg-black/70 border border-emerald-400/50 text-xs font-mono text-emerald-300 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(rateInput);
                    if (!isNaN(val) && val > 0) {
                      onUpdateUsdToBrlRate(val);
                    }
                    setIsEditingRate(false);
                  }}
                  className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingRate(true)}
                className="font-mono font-bold text-emerald-300 hover:underline"
                title="Clique para ajustar a cotação manualmente"
              >
                R$ {usdToBrlRate.toFixed(2)}
              </button>
            )}
            <button
              type="button"
              onClick={fetchLiveUsdBrlRate}
              disabled={isFetchingRate}
              className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
              title="Atualizar cotação do Dólar agora"
            >
              <RefreshCw
                className={`w-3 h-3 ${isFetchingRate ? 'animate-spin text-cyan-400' : ''}`}
              />
            </button>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-purple-500/25 rounded-xl px-2 py-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-purple-500/20 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-white min-w-[125px] text-center">
              {formattedMonthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-purple-500/20 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsCreating((v) => !v)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-xs font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Projeto
            </button>
          )}
        </div>
      </div>

      {/* Financial & Hourly Rate Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Ganhos no Mês (Concluídos) */}
        <div className="p-4 rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-950/35 via-[#0d091a]/90 to-[#0d091a]/90 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90">
              Ganhos no Mês ({formattedMonthLabel})
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-300 tracking-tight">
            {formatUsd(monthlyMetrics.completedUsd)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-emerald-200/90">
              {formatBrl(monthlyMetrics.completedBrl)}
            </span>
            <span className="text-[10px] text-slate-400">
              {completedProjectsForMonth.length} concluído(s)
            </span>
          </div>
        </div>

        {/* Card 2: Valor da Hora Média do Usuário */}
        <div className="p-4 rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-cyan-950/35 via-[#0d091a]/90 to-[#0d091a]/90 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/90">
              Valor da Hora Média
            </span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-cyan-300 tracking-tight">
            {formatUsd(monthlyMetrics.avgHourlyUsd)}
            <span className="text-xs font-normal text-cyan-400/80"> /h</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-cyan-200/90">
              {formatBrl(monthlyMetrics.avgHourlyBrl)} /h
            </span>
            <span className="text-[10px] text-slate-400">Média por hora</span>
          </div>
        </div>

        {/* Card 3: Em Andamento (Pipeline Ativo) */}
        <div className="p-4 rounded-2xl border border-purple-500/35 bg-gradient-to-br from-purple-950/35 via-[#0d091a]/90 to-[#0d091a]/90 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300/90">
              Projetos em Andamento
            </span>
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-purple-200 tracking-tight">
            {formatUsd(monthlyMetrics.activeUsd)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-purple-300/90">
              {formatBrl(monthlyMetrics.activeBrl)}
            </span>
            <span className="text-[10px] text-slate-400">
              {activeProjects.length} ativo(s)
            </span>
          </div>
        </div>

        {/* Card 4: Horas Contabilizadas em Projetos */}
        <div className="p-4 rounded-2xl border border-fuchsia-500/35 bg-gradient-to-br from-fuchsia-950/35 via-[#0d091a]/90 to-[#0d091a]/90 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300/90">
              Horas nos Projetos
            </span>
            <Clock className="w-4 h-4 text-fuchsia-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white tracking-tight">
            {formatStopwatch(monthlyMetrics.totalSecondsInMonth)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-fuchsia-200/90 font-medium">
              Concluídos: {formatDurationHuman(monthlyMetrics.completedSeconds)}
            </span>
            <span className="text-[10px] text-slate-400">
              Ativos: {formatDurationHuman(monthlyMetrics.activeSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Create New Project Form */}
      {isCreating && !readOnly && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-5 rounded-2xl border border-cyan-400/40 bg-[#120b24]/95 shadow-[0_0_40px_rgba(6,182,212,0.18)] space-y-4 animate-drawer-open"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Criar Novo Projeto de Trabalho
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Título do Projeto *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Edição de Vídeo NFL - Cliente X"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-purple-500/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-1">
                Valor do Projeto (USD $) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="150.00"
                  value={newAmountUsd}
                  onChange={(e) => setNewAmountUsd(e.target.value)}
                  className="w-full pl-7 pr-3.5 py-2 rounded-xl bg-black/50 border border-emerald-500/35 text-sm font-mono text-emerald-200 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>
              {newAmountUsd && !isNaN(parseFloat(newAmountUsd)) && (
                <div className="text-[10px] text-emerald-400/90 font-mono mt-1">
                  ≈ {formatBrl(parseFloat(newAmountUsd) * usdToBrlRate)}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Descrição (Opcional)
              </label>
              <input
                type="text"
                placeholder="Detalhes, entregáveis, observações do cliente..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-purple-500/30 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {PROJECT_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setNewColor(hex)}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      newColor === hex
                        ? 'scale-115 border-white ring-2 ring-white/40'
                        : 'border-white/20 opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-xs font-bold text-slate-950 shadow-lg transition-all cursor-pointer"
              >
                Criar Projeto
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Active Projects Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Projetos Trabalhando Agora ({activeProjects.length})
            </h3>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-400" />
              Arraste um projeto para a parte de baixo da tela quando terminar!
            </span>
          </div>
        </div>

        {activeProjects.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-purple-500/30 bg-[#0d091a]/50 text-center space-y-2">
            <Briefcase className="w-8 h-8 text-purple-400/60 mx-auto" />
            <div className="text-sm font-bold text-slate-200">
              Nenhum projeto ativo no momento
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Clique em <strong>Novo Projeto</strong> acima para adicionar um
              projeto com valor em dólares ($), atribuir as horas das suas
              tarefas (ex: &quot;editar&quot;) e acompanhar seu ganho por hora!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeProjects.map((project) => {
              const linkedCards = boardCards.filter(
                (c) => c.projectId === project.id
              );
              const totalSecs = getProjectTotalSeconds(
                project,
                boardCards,
                nowMs
              );
              const hasRunningTimer = linkedCards.some(
                (c) => c.status === 'in_progress'
              );
              const hoursFloat = totalSecs / 3600;
              const effectiveUsdPerHour =
                hoursFloat > 0 ? (project.amountUsd || 0) / hoursFloat : 0;
              const isDragging = draggedProjectId === project.id;
              const isEditing = editingId === project.id;
              const accentColor = project.color || '#a855f7';

              return (
                <div
                  key={project.id}
                  draggable={!readOnly && !isEditing}
                  onDragStart={(e) => onProjectDragStart(e, project.id)}
                  onDragEnd={onProjectDragEnd}
                  className={`group relative rounded-2xl border bg-[#0e0a1c]/90 backdrop-blur-xl p-4 neon-card-smooth animate-spring-pop flex flex-col justify-between ${
                    isDragging
                      ? 'opacity-40 scale-95 border-cyan-400'
                      : hasRunningTimer
                        ? 'border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                        : 'border-purple-500/30 hover:border-purple-400/60 hover:-translate-y-0.5 shadow-lg'
                  } ${!readOnly && !isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  style={{
                    borderTopWidth: '3px',
                    borderTopColor: accentColor,
                  }}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-purple-500/40 text-xs font-bold text-white"
                        placeholder="Título do projeto"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400">
                          USD $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={editAmountUsd}
                          onChange={(e) => setEditAmountUsd(e.target.value)}
                          className="w-28 px-2.5 py-1 rounded-lg bg-black/60 border border-emerald-500/40 text-xs font-mono text-emerald-300"
                        />
                      </div>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-purple-500/30 text-xs text-slate-300"
                        placeholder="Descrição opcional"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          {PROJECT_COLORS.map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => setEditColor(hex)}
                              className={`w-4 h-4 rounded-full border ${
                                editColor === hex
                                  ? 'border-white scale-110'
                                  : 'border-transparent opacity-70'
                              }`}
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 text-[11px]"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(project)}
                            className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px]"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Top Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: accentColor }}
                              />
                              <h4 className="text-sm font-bold text-white truncate">
                                {project.title}
                              </h4>
                            </div>
                            {project.description && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                {project.description}
                              </p>
                            )}
                          </div>

                          {/* Value Badge */}
                          <div className="text-right shrink-0">
                            <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-xs font-mono font-extrabold text-emerald-300">
                              {formatUsd(project.amountUsd || 0)}
                            </div>
                            <div className="text-[10px] font-mono text-emerald-400/80 mt-0.5">
                              {formatBrl(
                                (project.amountUsd || 0) * usdToBrlRate
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Time & Hourly Rate Box */}
                        <div className="mt-3 p-3 rounded-xl bg-black/45 border border-white/10 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                              Horas Contabilizadas
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock
                                className={`w-3.5 h-3.5 ${
                                  hasRunningTimer
                                    ? 'text-cyan-400 animate-spin'
                                    : 'text-purple-400'
                                }`}
                              />
                              <span className="text-sm font-mono font-bold text-white">
                                {formatStopwatch(totalSecs)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                              Valor / Hora no Projeto
                            </span>
                            <span className="text-xs font-mono font-bold text-cyan-300">
                              {effectiveUsdPerHour > 0
                                ? `${formatUsd(effectiveUsdPerHour)}/h (${formatBrl(effectiveUsdPerHour * usdToBrlRate)}/h)`
                                : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Linked Tasks List */}
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <span>
                              Tarefas Vinculadas ({linkedCards.length})
                            </span>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  setLinkingProjectId(
                                    linkingProjectId === project.id
                                      ? null
                                      : project.id
                                  )
                                }
                                className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 cursor-pointer"
                              >
                                <Link2 className="w-3 h-3" />
                                Vincular Tarefa
                              </button>
                            )}
                          </div>

                          {/* Quick task linker dropdown */}
                          {linkingProjectId === project.id && (
                            <div className="p-2 rounded-xl bg-black/80 border border-cyan-500/40 max-h-40 overflow-y-auto space-y-1">
                              {boardCards.filter(
                                (c) => c.projectId !== project.id
                              ).length === 0 ? (
                                <div className="text-[11px] text-slate-400 py-1 text-center">
                                  Todas as tarefas já estão vinculadas.
                                </div>
                              ) : (
                                boardCards
                                  .filter((c) => c.projectId !== project.id)
                                  .slice(0, 20)
                                  .map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        onAssignCardProject(c.id, project.id);
                                        setLinkingProjectId(null);
                                      }}
                                      className="w-full flex items-center justify-between px-2 py-1 rounded-lg hover:bg-cyan-500/20 text-left text-[11px] text-slate-200"
                                    >
                                      <span className="truncate pr-2">
                                        {c.title}
                                      </span>
                                      <span className="font-mono text-[10px] text-cyan-300 shrink-0">
                                        {formatDurationHuman(
                                          getLiveElapsedSeconds(c, nowMs)
                                        )}
                                      </span>
                                    </button>
                                  ))
                              )}
                            </div>
                          )}

                          {linkedCards.length === 0 ? (
                            <div className="text-[11px] text-slate-500 italic py-1">
                              Clique no ícone de projeto ao lado de
                              &quot;INICIAR&quot; na tarefa (ou em Vincular
                              Tarefa) para jogar as horas aqui.
                            </div>
                          ) : (
                            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                              {linkedCards.map((c) => {
                                const cSecs = getLiveElapsedSeconds(c, nowMs);
                                return (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                          c.status === 'in_progress'
                                            ? 'bg-cyan-400 animate-ping'
                                            : c.status === 'completed'
                                              ? 'bg-emerald-400'
                                              : 'bg-purple-400'
                                        }`}
                                      />
                                      <span className="truncate text-slate-200 text-[11px]">
                                        {c.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="font-mono text-[10px] text-cyan-300">
                                        {formatStopwatch(cSecs)}
                                      </span>
                                      {!readOnly && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onAssignCardProject(c.id, undefined)
                                          }
                                          className="text-slate-500 hover:text-rose-400"
                                          title="Desvincular tarefa do projeto"
                                        >
                                          <Unlink className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      {!readOnly && (
                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditing(project)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                              title="Editar projeto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteProject(project.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Excluir projeto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onCompleteProject(project.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold transition-all cursor-pointer"
                            title="Ou arraste o card para a parte inferior da tela!"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Concluir Projeto
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Projects of the Month Section */}
      <div className="space-y-3 pt-4 border-t border-purple-500/20">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Projetos Concluídos no Mês — {formattedMonthLabel} (
            {completedProjectsForMonth.length})
          </h3>
          <span className="text-xs font-mono text-emerald-300 font-bold">
            Total: {formatUsd(monthlyMetrics.completedUsd)} (
            {formatBrl(monthlyMetrics.completedBrl)})
          </span>
        </div>

        {completedProjectsForMonth.length === 0 ? (
          <div className="p-5 rounded-2xl border border-white/10 bg-black/25 text-center text-xs text-slate-400">
            Nenhum projeto concluído em {formattedMonthLabel} ainda. Arraste um
            projeto ativo para a parte inferior da tela quando finalizar!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {completedProjectsForMonth.map((project) => {
              const totalSecs = getProjectTotalSeconds(
                project,
                boardCards,
                nowMs
              );
              const hoursFloat = totalSecs / 3600;
              const effectiveRateUsd =
                hoursFloat > 0 ? (project.amountUsd || 0) / hoursFloat : 0;

              return (
                <div
                  key={project.id}
                  className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <h4 className="text-sm font-bold text-white">
                          {project.title}
                        </h4>
                      </div>
                      {project.description && (
                        <p className="text-xs text-slate-400 mt-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-extrabold text-emerald-300">
                        {formatUsd(project.amountUsd || 0)}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400/80">
                        {formatBrl((project.amountUsd || 0) * usdToBrlRate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-slate-300 font-mono">
                      ⏱ {formatStopwatch(totalSecs)} (
                      {formatDurationHuman(totalSecs)})
                    </span>
                    <span className="font-mono text-cyan-300 font-semibold">
                      {effectiveRateUsd > 0
                        ? `${formatUsd(effectiveRateUsd)}/h`
                        : '—'}
                    </span>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => onRestoreProject(project.id)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Voltar para Ativos
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProject(project.id)}
                        className="text-[11px] text-slate-500 hover:text-rose-400"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
