import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  LayoutGrid,
  Timer,
  Repeat,
  Tag,
  Clock,
  Trophy,
  Plus,
  Search,
  Users,
  Calendar,
  CalendarCheck,
  Move,
  Zap,
  BarChart3,
  CalendarRange,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  CheckSquare,
  HelpCircle,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onTabChange: (tab: ActiveTab) => void;
  currentTab: ActiveTab;
}

interface StepItem {
  id: number;
  phaseNumber: number;
  phaseName: string;
  tab: ActiveTab;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  previewType:
    | 'columns'
    | 'stopwatch'
    | 'recurrence'
    | 'priority'
    | 'time24h'
    | 'magicdock'
    | 'inlineadd'
    | 'toolbar'
    | 'friends'
    | 'calendar_grid'
    | 'calendar_cards'
    | 'calendar_drag'
    | 'dale_intro'
    | 'dale_kpis'
    | 'dale_consistency'
    | 'celebration';
}

const TUTORIAL_STEPS: StepItem[] = [
  // FASE 1: ABA BOARD (1 to 9)
  {
    id: 1,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (KANBAN & ROTINA DIÁRIA)',
    tab: 'board',
    title: 'As 5 Colunas Dinâmicas & Virada de Dia',
    subtitle: 'O fluxo inteligente que move suas tarefas automaticamente',
    description:
      'O Neon organiza seu dia em 5 colunas automatizadas baseadas no Horário de Brasília. À meia-noite, tarefas não concluídas descem sozinhas para "Yesterday", enquanto o "Tomorrow" vira o seu "Today" do dia!',
    icon: LayoutGrid,
    features: [
      'Yesterday (Atrasadas): O que não foi feito ontem desce para cá automaticamente.',
      'Today (Hoje): O foco absoluto do seu dia.',
      'Tomorrow (Amanhã): Planejamento do próximo dia sem misturar com hoje.',
      'This Week: Demandas distribuídas ao longo da semana.',
      'Future: Backlog e projetos a médio e longo prazo.',
    ],
    previewType: 'columns',
  },
  {
    id: 2,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (KANBAN & ROTINA DIÁRIA)',
    tab: 'board',
    title: 'Cronômetro de Foco em Tempo Real',
    subtitle: 'Rastreamento líquido para alimentar sua produtividade',
    description:
      'Cada tarefa tem seu próprio cronômetro em tempo real com botão de Play e Pause. Você pode pausar, retomar ou resetar a qualquer momento. O tempo roda ao vivo, persiste se você fechar o app e alimenta o histórico mensal no Dale!',
    icon: Timer,
    features: [
      'Clique no Play no próprio card para começar a focar na hora.',
      'Persistência em nuvem: seu tempo nunca é perdido.',
      'Alimenta o total de horas líquidas focadas na aba Dale.',
      'Destaque com pulso neon enquanto estiver gravando tempo.',
    ],
    previewType: 'stopwatch',
  },
  {
    id: 3,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (KANBAN & ROTINA DIÁRIA)',
    tab: 'board',
    title: 'Tarefas de Rotina & Hábitos Recorrentes',
    subtitle: 'Automatize sua consistência diária sem esforço',
    description:
      'Chega de recriar as mesmas tarefas todo dia! O Neon possui um motor inteligente de recorrência: ao concluir uma tarefa de rotina ou ao virar o dia, o app gera automaticamente a próxima ocorrência.',
    icon: Repeat,
    features: [
      'Dias da Semana: ex: Segunda a Sexta, ou dias alternados.',
      'Ciclos Consecutivos: com contador dinâmico (ex: "Dia 2 de 5").',
      'Dias Específicos: todo dia 5 e 20 de cada mês.',
      'Recriação automática instantânea.',
    ],
    previewType: 'recurrence',
  },
  {
    id: 4,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (KANBAN & ROTINA DIÁRIA)',
    tab: 'board',
    title: 'Labels de Prioridade & Tags de Categoria',
    subtitle: 'Classificação visual clara sem conflitos',
    description:
      'Defina o nível de urgência com as Labels de Prioridade (Baixa, Média, Máxima) com exclusão mútua — nunca haverá tarefas com prioridade alta e baixa ao mesmo tempo! Crie também suas próprias Tags de Categoria com cores personalizadas.',
    icon: Tag,
    features: [
      'Exclusão Mútua: escolher uma prioridade desseleciona as outras.',
      'Tags de Categoria no topo do card (ex: EDIÇÃO, YOUTUBE, CORTE).',
      'Paleta de cores customizável para identificar seus projetos na hora.',
      'Filtro instantâneo por etiqueta na barra de busca.',
    ],
    previewType: 'priority',
  },
  {
    id: 5,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (KANBAN & ROTINA DIÁRIA)',
    tab: 'board',
    title: 'Horários 24h, Blocos do Dia & Checklists',
    subtitle: 'Estruture o seu dia em Manhã, Tarde e Noite',
    description:
      'Defina início e fim no formato 24h (ex: 09:00 - 11:30). O Neon agrupa visualmente seus afazeres em Manhã, Tarde e Noite. Divida tarefas grandes em subtarefas com Checklist interativo e barra de progresso colorida.',
    icon: Clock,
    features: [
      'Formato 24h rígido com sincronização inteligente de horários.',
      'Agrupamento automático por períodos do dia (Manhã / Tarde / Noite).',
      'Checklist dinâmico com porcentagem de conclusão visual.',
      'Ordenação cronológica de manhã até a noite.',
    ],
    previewType: 'time24h',
  },
  {
    id: 6,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (KANBAN & ROTINA DIÁRIA)',
    tab: 'board',
    title: 'Drag & Drop & A Barra Mágica Inferior',
    subtitle: 'Mova tarefas com fluidez e conclua com confetes',
    description:
      'Arraste cartões entre colunas para reagendar ou reordenar. Quando você começa a arrastar um card para a parte inferior da tela, a Barra Mágica aparece: solte na zona verde para concluir com festa de confetes neon, ou na vermelha para excluir!',
    icon: Trophy,
    features: [
      'Arraste suave com física fluida entre colunas.',
      'Soltar para Concluir: chuva de confetes neon comemorativos.',
      'Soltar na Lixeira: exclusão rápida sem abrir confirmações chatas.',
      'Feedback tátil e visual brilhante durante o arraste.',
    ],
    previewType: 'magicdock',
  },
  {
    id: 7,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (KANBAN & ROTINA DIÁRIA)',
    tab: 'board',
    title: 'Adição Rápida Inline & Edição Completa',
    subtitle: 'Crie em 2 segundos e edite tudo no modal',
    description:
      'No final de cada coluna existe o botão "+ Adicionar tarefa". O formulário se expande direto no board com campos para título, horário, prioridade e recorrência. Quer editar mais? Basta clicar no cartão para abrir o modal completo.',
    icon: Plus,
    features: [
      'Adição rápida inline sem travar a navegação.',
      'Modal completo com título, descrição rica, checklists e cronômetro.',
      'Identificação imutável do criador da tarefa ("Criado por: Nome").',
      'Renomeação de colunas e customização rápida.',
    ],
    previewType: 'inlineadd',
  },
  {
    id: 8,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (KANBAN & ROTINA DIÁRIA)',
    tab: 'board',
    title: 'Barra de Ferramentas, Filtros & Partículas',
    subtitle: 'Mantenha o foco absoluto e o visual do seu jeito',
    description:
      'No cabeçalho do board você encontra ferramentas de alta precisão: campo de busca em tempo real, filtro "Em Andamento" para esconder o que não está rodando agora, botão para recolher a coluna de Ontem e controle de partículas.',
    icon: Search,
    features: [
      'Busca global instantânea por título, tag ou etiquetas.',
      'Filtro "Em Andamento": foca apenas nas tarefas com cronômetro rodando.',
      'Ocultar/Mostrar Ontem: deixa sua tela limpa e focada em hoje.',
      'Toggle de partículas neon flutuantes no plano de fundo.',
    ],
    previewType: 'toolbar',
  },
  {
    id: 9,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (KANBAN & ROTINA DIÁRIA)',
    tab: 'board',
    title: 'Multi-Board & Sistema de Amigos (Neon Cloud)',
    subtitle: 'Conecte-se em dupla e transfira tarefas arrastando',
    description:
      'Navegue entre seus boards no seletor do topo. Ao conectar seu amigo pelo Código de Amigo (ex: SEUNOME#1234), você pode ver o board dele e até ARRASTAR um card do seu board diretamente para a aba do seu amigo para transferir uma tarefa!',
    icon: Users,
    features: [
      'Código de Amigo exclusivo para conectar parceiros de trabalho.',
      'Transferência Cross-Board: arraste um card até a aba do amigo no topo!',
      'Sincronização em nuvem automática e em tempo real.',
      'Cada usuário mantém suas iniciais e gradiente único.',
    ],
    previewType: 'friends',
  },

  // FASE 2: ABA CALENDÁRIO (10 to 12)
  {
    id: 10,
    phaseNumber: 2,
    phaseName: 'FASE 2: ABA CALENDÁRIO (VISÃO MENSAL & AGENDAMENTO)',
    tab: 'calendar',
    title: 'Visão Mensal em Grade & Navegação',
    subtitle: 'Visão panorâmica de todos os dias e compromissos',
    description:
      'A aba Calendário oferece uma visão geral do mês inteiro, distribuindo seus cards pelas datas reais de execução. Navegue livremente para meses passados ou futuros e use o botão "Hoje" para retornar ao dia atual com um clique.',
    icon: Calendar,
    features: [
      'Grade mensal completa com destaques no dia de hoje.',
      'Setas de navegação rápida de mês e ano.',
      'Totalizador de tarefas diárias em cada célula.',
      'Visão limpa para planejar semanas inteiras com antecedência.',
    ],
    previewType: 'calendar_grid',
  },
  {
    id: 11,
    phaseNumber: 2,
    phaseName: 'FASE 2: ABA CALENDÁRIO (VISÃO MENSAL & AGENDAMENTO)',
    tab: 'calendar',
    title: 'Mini-Cards no Calendário & Detalhes do Dia',
    subtitle: 'Inspecione seus horários sem sair da visão mensal',
    description:
      'Cada dia exibe mini-cards coloridos com horário, título e etiqueta. Clicando em qualquer dia, abre-se a gaveta detalhada com todos os afazeres daquela data, permitindo abrir o modal, dar play no cronômetro ou criar novas tarefas.',
    icon: CalendarCheck,
    features: [
      'Mini-cards com cores de categoria e horários nas células.',
      'Clique em qualquer dia para abrir o painel lateral completo.',
      'Crie tarefas para qualquer data futura com horários e tags.',
      'Controle de play/pause no cronômetro direto pelo calendário.',
    ],
    previewType: 'calendar_cards',
  },
  {
    id: 12,
    phaseNumber: 2,
    phaseName: 'FASE 2: ABA CALENDÁRIO (VISÃO MENSAL & AGENDAMENTO)',
    tab: 'calendar',
    title: 'Reagendamento Instantâneo por Arraste',
    subtitle: 'Mude a data de uma tarefa em 1 segundo',
    description:
      'Precisa adiar ou antecipar uma demanda? Basta clicar e arrastar o card de uma data para outra no calendário! O Neon atualiza a data agendada instantaneamente e sincroniza automaticamente com o Board Kanban.',
    icon: Move,
    features: [
      'Arraste entre dias do calendário sem precisar abrir o card.',
      'Reconciliação automática com Yesterday, Today e Tomorrow no Kanban.',
      'Feedback visual de realce no dia de destino.',
      'Agilidade total para remanejar prazos.',
    ],
    previewType: 'calendar_drag',
  },

  // FASE 3: ABA DALE (13 to 16)
  {
    id: 13,
    phaseNumber: 3,
    phaseName: 'FASE 3: ABA DALE (METAS, HISTÓRICO & PERFORMANCE)',
    tab: 'history',
    title: 'A Filosofia Dale: Disciplina & Prestação de Contas',
    subtitle: 'O painel onde a sua evolução é comprovada em números',
    description:
      'O "Dale" é o núcleo de comprovação de consistência do Neon. Aqui não há espaço para desculpas: cada tarefa concluída e cada minuto trabalhado no cronômetro são consolidados para comprovar a sua disciplina e a da sua dupla.',
    icon: Zap,
    features: [
      'Foco em entrega real e metas batidas.',
      'Prestação de contas transparente entre amigos conectados.',
      'Métricas auditáveis baseadas no uso real do app.',
      'Energia e motivação para manter o ritmo diário.',
    ],
    previewType: 'dale_intro',
  },
  {
    id: 14,
    phaseNumber: 3,
    phaseName: 'FASE 3: ABA DALE (METAS, HISTÓRICO & PERFORMANCE)',
    tab: 'history',
    title: 'Métricas do Mês: Taxa % & Horas Focadas',
    subtitle: 'Seus KPIs essenciais atualizados em tempo real',
    description:
      'No topo da aba Dale você visualiza seus dois indicadores principais: a Taxa de Conclusão (%) — calculando tarefas planejadas versus entregues — e o Somatório de Horas Focadas, que acumula o tempo líquido do cronômetro.',
    icon: BarChart3,
    features: [
      'Taxa de Conclusão (%): Mostra a eficiência das suas semanas.',
      'Horas Focadas: Somatório líquido dos cronômetros rodados.',
      'Comparativo de evolução com o mês anterior.',
      'Cálculo automático e à prova de falhas.',
    ],
    previewType: 'dale_kpis',
  },
  {
    id: 15,
    phaseNumber: 3,
    phaseName: 'FASE 3: ABA DALE (METAS, HISTÓRICO & PERFORMANCE)',
    tab: 'history',
    title: 'Consistência Diária & Histórico Mensal',
    subtitle: 'Navegue no tempo e audite sua consistência',
    description:
      'O mapa de calor e a lista de tarefas concluídas mostram os dias em que você bateu suas metas. Você pode navegar para meses anteriores para analisar como foi sua produtividade e comprovar seu crescimento.',
    icon: CalendarRange,
    features: [
      'Linha do tempo diária com tarefas concluídas por data.',
      'Seletor de meses para consultar todo o histórico passado.',
      'Auditoria de horários gastos e tarefas concluídas com sucesso.',
      'Motivação visual com sequência de consistência batida.',
    ],
    previewType: 'dale_consistency',
  },
  {
    id: 16,
    phaseNumber: 3,
    phaseName: 'TUTORIAL CONCLUÍDO!',
    tab: 'board',
    title: 'Você está Pronto! Bem-vindo ao Neon',
    subtitle: 'Domínio total das ferramentas de alta performance',
    description:
      'Sensacional! Você agora conhece 100% dos recursos do Neon: das 5 colunas dinâmicas aos cronômetros, recorrências, calendário mensal e métricas do Dale. Sempre que quiser rever este guia, basta clicar no botão de Ajuda (?) no topo da tela.',
    icon: Sparkles,
    features: [
      'Domínio completo de todas as abas e atalhos.',
      'Botão permanente de Ajuda (?) adicionado no topo da tela.',
      'Suas tarefas já estão organizadas no Board para você começar.',
      'Agora é com você: foco total e DALE!',
    ],
    previewType: 'celebration',
  },
];

export function OnboardingTutorial({
  isOpen,
  onClose,
  onTabChange,
  currentTab,
}: OnboardingTutorialProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = TUTORIAL_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;
  const progressPct = Math.round(
    ((currentStepIndex + 1) / TUTORIAL_STEPS.length) * 100
  );

  // Sync parent tab when step changes
  useEffect(() => {
    if (!isOpen) return;
    if (step.tab !== currentTab) {
      onTabChange(step.tab);
    }
  }, [currentStepIndex, isOpen, step.tab, currentTab, onTabChange]);

  // Keyboard navigation: ArrowRight / ArrowLeft / Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && !isLast) {
        e.preventDefault();
        setCurrentStepIndex((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1));
      } else if (e.key === 'ArrowLeft' && !isFirst) {
        e.preventDefault();
        setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleFinishTutorial();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFirst, isLast]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLast) {
      handleFinishTutorial();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleFinishTutorial = () => {
    try {
      localStorage.setItem('neon_tutorial_completed_v1', 'true');
    } catch {
      // ignore
    }
    onTabChange('board');
    onClose();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22d3ee', '#d946ef', '#10b981', '#f59e0b'],
    });
  };

  const StepIcon = step.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        // Prevent accidental closing by clicking backdrop, but offer skip button
        e.stopPropagation();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0d071a]/95 border-2 border-cyan-400/50 shadow-2xl shadow-cyan-950/80 p-6 sm:p-7 text-slate-100 animate-spring-pop overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glowing Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400" />

        {/* Ambient background glow */}
        <div className="absolute -top-24 -left-24 w-56 h-56 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 rounded-full bg-fuchsia-500/15 blur-3xl pointer-events-none" />

        {/* Header: Phase badge + Step counter + Close button */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/20">
              {step.phaseName}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Passo <strong className="text-white">{step.id}</strong> de{' '}
              {TUTORIAL_STEPS.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinishTutorial}
            title="Pular Tutorial (Esc)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar with Gradient */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-5 flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Main Content Area (Scrollable if needed) */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4">
          {/* Title & Icon Header */}
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/25 to-purple-600/25 border border-cyan-400/50 text-cyan-300 shadow-lg shadow-cyan-500/20 flex-shrink-0 animate-bounce-gentle">
              <StepIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight font-display">
                {step.title}
              </h2>
              <p className="text-xs text-cyan-300 font-semibold mt-0.5">
                {step.subtitle}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5">
            {step.description}
          </p>

          {/* Visual Interactive Preview Box (Glows & Bounces) */}
          <div className="p-4 rounded-xl bg-[#070412]/80 border border-purple-500/30 shadow-inner">
            <VisualPreview previewType={step.previewType} />
          </div>

          {/* Key Features Bullet List */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              O que você precisa saber:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              {step.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/5 text-[11px] text-slate-200"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: Step Indicators + Back/Next Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10 mt-4 flex-shrink-0">
          {/* Quick step jump indicators */}
          <div className="hidden sm:flex items-center gap-1">
            {TUTORIAL_STEPS.map((s, idx) => {
              const active = idx === currentStepIndex;
              const completed = idx < currentStepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  title={`Ir para passo ${s.id}: ${s.title}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    active
                      ? 'w-6 bg-cyan-400 shadow-sm shadow-cyan-400/80 ring-1 ring-cyan-300'
                      : completed
                      ? 'w-2 bg-purple-500/70 hover:bg-purple-400'
                      : 'w-2 bg-white/15 hover:bg-white/30'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFinishTutorial}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Pular
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-cyan-400 to-fuchsia-400 hover:from-cyan-300 hover:to-fuchsia-300 tutorial-glow-btn flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <span>{isLast ? 'Começar a Usar Agora 🚀' : 'Próximo'}</span>
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Visual Previews with glowing buttons & bouncing mock widgets
// -------------------------------------------------------------
function VisualPreview({
  previewType,
}: {
  previewType: StepItem['previewType'];
}) {
  switch (previewType) {
    case 'columns':
      return (
        <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold">
          <div className="flex-1 p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-center shadow-sm">
            <span className="block text-[8px] uppercase tracking-wider text-rose-400 font-extrabold">
              Atrasadas
            </span>
            <span>Yesterday</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
          <div className="flex-1 p-2 rounded-lg bg-cyan-500/20 border-2 border-cyan-400 text-cyan-200 text-center shadow-lg shadow-cyan-500/20 tutorial-glow-btn">
            <span className="block text-[8px] uppercase tracking-wider text-cyan-300 font-extrabold">
              Foco Hoje
            </span>
            <span>Today</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
          <div className="flex-1 p-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-center">
            <span className="block text-[8px] uppercase tracking-wider text-blue-400 font-extrabold">
              Amanhã
            </span>
            <span>Tomorrow</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
          <div className="flex-1 p-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-center">
            <span className="block text-[8px] uppercase tracking-wider text-purple-400 font-extrabold">
              Semana
            </span>
            <span>This Week</span>
          </div>
        </div>
      );

    case 'stopwatch':
      return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#110a26] border border-cyan-400/50 shadow-md shadow-cyan-500/15">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse">
              <Timer className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cronômetro Ativo • Rodando
              </span>
              <span className="text-lg font-extrabold text-cyan-300 font-mono tracking-wider">
                00:45:18
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-cyan-500/30 tutorial-glow-btn">
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Focando</span>
            </span>
          </div>
        </div>
      );

    case 'recurrence':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" />
              <span>Modo de Recorrência Inteligente</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40">
              Dia 2 de 5
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((d, i) => (
              <span
                key={d}
                className={`flex-1 py-1 text-center rounded-md text-[10px] font-bold border transition-all ${
                  i < 4
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-500'
                }`}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      );

    case 'priority':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Selecione uma prioridade (Exclusão Mútua):</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="flex-1 py-1.5 text-center rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/40">
              Prioridade baixa
            </span>
            <span className="flex-1 py-1.5 text-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/40">
              Prioridade média
            </span>
            <span className="flex-1 py-1.5 text-center rounded-lg bg-rose-500 text-white border border-rose-400 shadow-md shadow-rose-500/40 font-extrabold ring-2 ring-rose-400/60 tutorial-glow-btn">
              Prioridade máxima ✓
            </span>
          </div>
        </div>
      );

    case 'time24h':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Clock className="w-3.5 h-3.5" />
              <span>Horário: 09:30 ➔ 11:00</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              MANHÃ
            </span>
          </div>
          <div className="bg-black/40 p-2.5 rounded-lg border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">Checklist: 2 de 3 concluídas</span>
              <span className="font-bold text-cyan-300">67%</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full w-2/3 shadow-sm shadow-cyan-400/80" />
            </div>
          </div>
        </div>
      );

    case 'magicdock':
      return (
        <div className="p-3 rounded-xl bg-black/50 border border-white/15 text-center space-y-2">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            Barra Mágica Inferior (ao arrastar um card para baixo)
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 p-2.5 rounded-xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 tutorial-glow-btn">
              <Trophy className="w-4 h-4 text-emerald-300" />
              <span>Solte para Concluir (Confetes!)</span>
            </div>
            <div className="flex-1 p-2.5 rounded-xl bg-rose-500/20 border-2 border-rose-500 text-rose-300 font-extrabold text-xs flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-300" />
              <span>Solte na Lixeira</span>
            </div>
          </div>
        </div>
      );

    case 'inlineadd':
      return (
        <div className="p-2.5 rounded-xl bg-[#0b0717] border-2 border-cyan-400 space-y-2 tutorial-glow-btn">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-cyan-300" />
            <span>Adicionar nova tarefa inline na coluna</span>
          </div>
          <div className="bg-black/50 border border-purple-500/30 rounded-lg p-2 text-xs text-slate-400">
            "Editar corte principal do vídeo..."
          </div>
        </div>
      );

    case 'toolbar':
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-black/50 border border-cyan-400/40 rounded-xl px-3 py-1.5 text-xs text-slate-400 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Buscar tarefas, tags ou prioridades...</span>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-bold flex items-center gap-1 shadow-sm">
            <Play className="w-3 h-3 fill-cyan-300" />
            <span>Em Andamento</span>
          </span>
        </div>
      );

    case 'friends':
      return (
        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/40 to-cyan-950/40 border border-cyan-400/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fuchsia-500 to-cyan-400 flex items-center justify-center text-xs font-black text-slate-950 shadow-md">
              EL
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Seu Código de Amigo</span>
              <span className="text-[10px] text-cyan-300 font-mono font-bold">ELBIOH#5069</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1">
            <Users className="w-3 h-3 text-cyan-300" />
            <span>Conectar Dupla</span>
          </span>
        </div>
      );

    case 'calendar_grid':
      return (
        <div className="p-3 rounded-xl bg-black/40 border border-cyan-400/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
            <span>Visão Mensal do Calendário</span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[10px]">
              Botão "Hoje"
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <span key={i} className="font-bold text-slate-500">{d}</span>
            ))}
            {[14, 15, 16, 17, 18, 19, 20].map((day) => (
              <span
                key={day}
                className={`py-1.5 rounded-md font-bold ${
                  day === 18
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40 ring-1 ring-cyan-300 tutorial-glow-btn'
                    : 'bg-white/5 text-slate-300'
                }`}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      );

    case 'calendar_cards':
      return (
        <div className="p-3 rounded-xl bg-[#120a26] border border-cyan-400/40 space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Mini-cards dentro da data (com horário e tag)
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-white">Reunião de Alinhamento</span>
            </div>
            <span className="text-[10px] text-cyan-300 font-mono font-bold">14:00</span>
          </div>
        </div>
      );

    case 'calendar_drag':
      return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-purple-500/30">
          <div className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] text-slate-400 block">Dia 18 (Hoje)</span>
            <span className="text-xs font-bold text-white">Tarefa Original</span>
          </div>
          <div className="flex flex-col items-center text-cyan-400 animate-bounce-gentle">
            <Move className="w-5 h-5" />
            <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">Arraste</span>
          </div>
          <div className="flex-1 p-2 rounded-lg bg-cyan-500/20 border-2 border-cyan-400 text-center shadow-lg shadow-cyan-500/20 tutorial-glow-btn">
            <span className="text-[10px] text-cyan-300 block">Dia 19 (Amanhã)</span>
            <span className="text-xs font-bold text-cyan-200">Nova Data ✓</span>
          </div>
        </div>
      );

    case 'dale_intro':
      return (
        <div className="flex items-center justify-center p-4 rounded-xl bg-gradient-to-r from-fuchsia-950/40 to-cyan-950/40 border-2 border-cyan-400 shadow-xl shadow-cyan-500/15 text-center space-y-1 tutorial-glow-btn">
          <div>
            <Zap className="w-8 h-8 text-cyan-300 mx-auto animate-bounce-gentle" />
            <span className="text-sm font-extrabold text-white block tracking-wider mt-1 font-display">
              PAINEL DALE: DISCIPLINA SEM DESCULPAS
            </span>
            <span className="text-[10px] text-cyan-300 block">
              Comprove que a rotina está sendo cumprida dia após dia
            </span>
          </div>
        </div>
      );

    case 'dale_kpis':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#120a26] border border-cyan-400/40 text-center shadow-md">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">
              Taxa de Conclusão
            </span>
            <span className="text-2xl font-black text-cyan-300 font-mono">92%</span>
            <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">
              +14% vs mês passado
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#120a26] border border-fuchsia-400/40 text-center shadow-md">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">
              Horas Focadas (Líquidas)
            </span>
            <span className="text-2xl font-black text-fuchsia-300 font-mono">38h 45m</span>
            <span className="text-[9px] text-cyan-300 font-bold block mt-0.5">
              Tempo real do cronômetro
            </span>
          </div>
        </div>
      );

    case 'dale_consistency':
      return (
        <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-300">Consistência Diária do Mês</span>
            <span className="text-cyan-300">24 dias batidos</span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className={`flex-1 h-5 rounded-sm ${
                  i % 3 === 0
                    ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                    : i % 2 === 0
                    ? 'bg-fuchsia-500'
                    : 'bg-emerald-400'
                }`}
              />
            ))}
          </div>
        </div>
      );

    case 'celebration':
      return (
        <div className="p-4 rounded-xl bg-gradient-to-r from-fuchsia-600/25 via-purple-600/25 to-cyan-500/25 border-2 border-cyan-400 text-center shadow-2xl shadow-cyan-500/25 tutorial-glow-btn">
          <Sparkles className="w-9 h-9 text-cyan-300 mx-auto animate-bounce-gentle" />
          <h4 className="text-base font-extrabold text-white mt-2 font-display">
            TUDO PRONTO PARA O SEU DIA RENDIMENTO MÁXIMO!
          </h4>
          <p className="text-[11px] text-cyan-200 mt-1">
            Clique no botão abaixo para começar. O botão de Ajuda (?) estará sempre no cabeçalho se precisar rever.
          </p>
        </div>
      );

    default:
      return null;
  }
}
