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
  Trash2,
  Target,
  ArrowRight,
  CheckCircle2,
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
  isMission?: boolean;
  missionObjective?: string;
  missionTip?: string;
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
  // PASSO 1: TEÓRICO (Board)
  {
    id: 1,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (KANBAN INTELIGENTE)',
    tab: 'board',
    title: 'As 5 Colunas Dinâmicas & Virada de Dia',
    subtitle: 'O fluxo automático baseado no Horário de Brasília',
    description:
      'O Neon organiza seu dia em 5 colunas automatizadas. À meia-noite (Brasília), tarefas não concluídas descem sozinhas para "Yesterday", enquanto "Tomorrow" se torna o seu "Today" do dia!',
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

  // PASSO 2: PRÁTICO - MISSÃO 1 (Board)
  {
    id: 2,
    phaseNumber: 1,
    phaseName: 'MISSÃO PRÁTICA 1/9',
    tab: 'board',
    title: 'Crie sua Primeira Tarefa no Board',
    subtitle: 'Adicione uma demanda prática na coluna Today',
    description:
      'Agora é a sua vez! Vá até a coluna Today (Hoje), clique no botão "+ Adicionar tarefa", digite um título de teste (ex: "Minha Tarefa de Teste") e clique em Salvar.',
    icon: Plus,
    isMission: true,
    missionObjective:
      'Clique no botão "+ Adicionar tarefa" na coluna Today e crie uma tarefa teste.',
    missionTip:
      'O formulário se expande na própria coluna inline com campos rápidos!',
    features: [
      'Adição inline rápida sem sair da tela.',
      'Nomeie a tarefa com o que quiser testar.',
      'Ao salvar, ela aparece instantaneamente no topo do Today.',
    ],
    previewType: 'inlineadd',
  },

  // PASSO 3: TEÓRICO (Board)
  {
    id: 3,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (RASTREAMENTO DE TEMPO)',
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

  // PASSO 4: PRÁTICO - MISSÃO 2 (Board)
  {
    id: 4,
    phaseNumber: 1,
    phaseName: 'MISSÃO PRÁTICA 2/9',
    tab: 'board',
    title: 'Cronometre sua Tarefa Teste',
    subtitle: 'Inicie a contagem de tempo de foco no seu cartão',
    description:
      'Localize a tarefa que você acabou de criar na coluna Today e clique no botão de Play (▶). Veja os segundos começarem a correr ao vivo com pulso neon! Deixe rodar alguns segundos e pause.',
    icon: Play,
    isMission: true,
    missionObjective:
      'Dê Play (▶) no cronômetro da sua tarefa teste e veja os segundos rodando ao vivo.',
    missionTip:
      'O tempo gravado é somado automaticamente no painel Dale para auditar sua disciplina!',
    features: [
      'Botão Play/Pause direto na face do card.',
      'Cronômetro de segundos ao vivo.',
      'Clique novamente no botão para pausar.',
    ],
    previewType: 'stopwatch',
  },

  // PASSO 5: TEÓRICO (Board)
  {
    id: 5,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (ORGANIZAÇÃO & PRIORIDADES)',
    tab: 'board',
    title: 'Labels de Prioridade, Tags & Horários 24h',
    subtitle: 'Classificação visual clara sem conflitos',
    description:
      'Defina o nível de urgência com as Labels de Prioridade (Baixa, Média, Máxima) com exclusão mútua — nunca haverá tarefas com prioridade alta e baixa ao mesmo tempo! Configure também horários 24h para organizar seu dia em Manhã, Tarde e Noite.',
    icon: Tag,
    features: [
      'Exclusão Mútua: escolher uma prioridade desseleciona as outras.',
      'Tags de Categoria no topo do card (ex: EDIÇÃO, YOUTUBE, CORTE).',
      'Horários no formato rígido 24h (ex: 09:00 - 11:30).',
      'Agrupamento cronológico automático por períodos do dia.',
    ],
    previewType: 'priority',
  },

  // PASSO 6: PRÁTICO - MISSÃO 3 (Board)
  {
    id: 6,
    phaseNumber: 1,
    phaseName: 'MISSÃO PRÁTICA 3/9',
    tab: 'board',
    title: 'Reagende uma Tarefa por Arraste',
    subtitle: 'Mova seu cartão de Today para Tomorrow',
    description:
      'Precisa adiar uma demanda sem complicação? Clique e segure no seu card teste e arraste-o da coluna "Today" para a coluna "Tomorrow". Solte-o para ver a sincronização automática de data!',
    icon: Move,
    isMission: true,
    missionObjective:
      'Arraste sua tarefa teste da coluna "Today" para "Tomorrow" para reagendar.',
    missionTip:
      'A data agendada do card é atualizada automaticamente para o dia de amanhã!',
    features: [
      'Arraste fluido entre qualquer coluna do board.',
      'Atualização instantânea de data no calendário.',
      'Sem menus chatos: reagendamento em 1 segundo.',
    ],
    previewType: 'columns',
  },

  // PASSO 7: TEÓRICO (Board)
  {
    id: 7,
    phaseNumber: 1,
    phaseName: 'FASE 1: ABA BOARD (FINALIZAÇÃO & BARRA MÁGICA)',
    tab: 'board',
    title: 'Drag & Drop & A Barra Mágica Inferior',
    subtitle: 'Mova tarefas com fluidez e conclua com festa de confetes',
    description:
      'Quando você começa a arrastar qualquer card em direção à parte inferior da tela, a Barra Mágica aparece automaticamente: solte na zona verde para concluir com festa de confetes neon, ou na vermelha para excluir!',
    icon: Trophy,
    features: [
      'Soltar no Troféu: conclusão imediata com chuva de confetes neon.',
      'Soltar na Lixeira: exclusão rápida sem confirmações redundantes.',
      'Persistência imediata com cálculo de horas no Dale.',
      'Feedback tátil e visual durante todo o movimento.',
    ],
    previewType: 'magicdock',
  },

  // PASSO 8: PRÁTICO - MISSÃO 4 (Board)
  {
    id: 8,
    phaseNumber: 1,
    phaseName: 'MISSÃO PRÁTICA 4/9',
    tab: 'board',
    title: 'Conclua a Tarefa Arrastando para Baixo',
    subtitle: 'Solte no Troféu da Barra Mágica e curta a festa',
    description:
      'Pegue o seu card teste e arraste-o para baixo em direção ao rodapé. Veja a Barra Mágica surgir: solte o cartão na área verde "Solte para Concluir" e celebre com os confetes neon!',
    icon: CheckCircle2,
    isMission: true,
    missionObjective:
      'Arraste sua tarefa teste até a Barra Mágica no rodapé e solte na área verde do Troféu.',
    missionTip:
      'Você também pode concluir tarefas pelo modal clicando em "Marcar como Concluída"!',
    features: [
      'Aparecimento dinâmico da Barra Mágica ao arrastar.',
      'Animação de celebração com confetes multicoloridos.',
      'A tarefa vai diretamente para o histórico de sucessos no Dale.',
    ],
    previewType: 'magicdock',
  },

  // PASSO 9: PRÁTICO - MISSÃO 5 (Board -> Criação de Rotina ANTES do Passo 10)
  {
    id: 9,
    phaseNumber: 1,
    phaseName: 'MISSÃO PRÁTICA 5/9',
    tab: 'board',
    title: 'Crie uma Tarefa de Rotina Recorrente',
    subtitle: 'Automatize dias da semana para o mês inteiro',
    description:
      'Agora vamos criar uma rotina! Na coluna Today, clique em "+ Adicionar tarefa", clique no ícone de Repetir (Rotina), escolha "Dias da Semana" (ex: Segundas e Terças) e clique em Salvar.',
    icon: Repeat,
    isMission: true,
    missionObjective:
      'Crie uma tarefa de rotina escolhendo dias da semana (ex: Seg e Ter) no formulário inline.',
    missionTip:
      'Ao salvar, o Neon vai preencher automaticamente todas as segundas e terças do mês dali para frente!',
    features: [
      'Motor de recorrência inteligente dali para frente.',
      'Preenchimento automático do mês no calendário.',
      'Garante que você nunca esqueça seus compromissos recorrentes.',
    ],
    previewType: 'recurrence',
  },

  // PASSO 10: TEÓRICO (Calendário)
  {
    id: 10,
    phaseNumber: 2,
    phaseName: 'FASE 2: ABA CALENDÁRIO (VISÃO MENSAL & GESTÃO)',
    tab: 'calendar',
    title: 'Visão Mensal em Grade & Navegação',
    subtitle: 'Visão panorâmica de todos os dias e compromissos do mês',
    description:
      'A aba Calendário oferece uma visão geral do mês inteiro, distribuindo seus cards pelas datas reais de execução. Clicando em qualquer dia, você abre a gaveta de tarefas daquela data!',
    icon: Calendar,
    features: [
      'Grade mensal completa com destaques no dia de hoje.',
      'Setas de navegação rápida de mês e ano.',
      'Totalizador de tarefas diárias em cada célula.',
      'Visão limpa para planejar semanas inteiras com antecedência.',
    ],
    previewType: 'calendar_grid',
  },

  // PASSO 11: PRÁTICO - MISSÃO 6 (Calendário)
  {
    id: 11,
    phaseNumber: 2,
    phaseName: 'MISSÃO PRÁTICA 6/9',
    tab: 'calendar',
    title: 'Veja a Rotina Preencher o Mês',
    subtitle: 'Inspecione todos os dias populados automaticamente',
    description:
      'Observe a grade do Calendário: a tarefa de rotina que você acabou de criar no passo anterior preencheu automaticamente todas as semanas do mês dali para frente! Clique nos dias marcados para inspecionar os cartões.',
    icon: CalendarCheck,
    isMission: true,
    missionObjective:
      'Navegue pelos dias do calendário e veja os cards da sua rotina espalhados pelo mês.',
    missionTip:
      'Cada dia tem seu mini-card com horário e badge. Clicando no dia, abre o painel lateral!',
    features: [
      'Preenchimento automático de dias da semana no mês.',
      'Visão clara da densidade de trabalho em cada dia.',
      'Sincronização 100% perfeita com o Board Kanban.',
    ],
    previewType: 'calendar_cards',
  },

  // PASSO 12: PRÁTICO - MISSÃO 7 (Calendário)
  {
    id: 12,
    phaseNumber: 2,
    phaseName: 'MISSÃO PRÁTICA 7/9',
    tab: 'calendar',
    title: 'Exclusão em Bloco da Rotina',
    subtitle: 'Apague uma ocorrência e veja todas sumirem juntas',
    description:
      'Clique em qualquer uma das tarefas da rotina no calendário para abrir seu modal e clique em "Excluir Tarefa (e repetições)". Veja a mágica: TODAS as ocorrências dessa rotina somem simultaneamente de todo o mês!',
    icon: Trash2,
    isMission: true,
    missionObjective:
      'Abra qualquer card da rotina e clique em "Excluir Tarefa (e repetições)": todas as repetições sumirão juntas!',
    missionTip:
      'Chega de apagar 30 tarefas uma a uma! A exclusão em bloco limpa toda a série com 1 clique.',
    features: [
      'Exclusão atômica de todo o grupo de rotina (groupId).',
      'Funciona pelo modal, arrastando para a lixeira ou no Dale.',
      'Zero lixo residual no calendário.',
    ],
    previewType: 'calendar_drag',
  },

  // PASSO 13: TEÓRICO (Dale)
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
      'Taxa de Conclusão (%) calculada automaticamente.',
      'Horas focadas líquidas somadas em tempo real.',
      'Linha do tempo diária para auditar sua consistência.',
    ],
    previewType: 'dale_intro',
  },

  // PASSO 14: PRÁTICO - MISSÃO 8 (Dale)
  {
    id: 14,
    phaseNumber: 3,
    phaseName: 'MISSÃO PRÁTICA 8/9',
    tab: 'history',
    title: 'Audite a Tarefa Concluída no Dale',
    subtitle: 'Inspecione sua entrega e o tempo focado gravado',
    description:
      'Veja aqui na aba Dale a primeira tarefa que você concluiu na Missão 4! Observe a linha do tempo do dia de hoje: sua tarefa está salva com o tempo que você cronometrou e os KPIs atualizados no topo.',
    icon: BarChart3,
    isMission: true,
    missionObjective:
      'Inspecione sua tarefa teste finalizada na lista do Dale e observe as horas focadas.',
    missionTip:
      'O Dale é o seu comprovante irrefutável de foco e consistência diária!',
    features: [
      'Registro indelével de tarefas entregues.',
      'Contador de tempo focado auditável.',
      'Histórico mensal completo por data.',
    ],
    previewType: 'dale_kpis',
  },

  // PASSO 15: PRÁTICO - MISSÃO 9 (Dale)
  {
    id: 15,
    phaseNumber: 3,
    phaseName: 'MISSÃO PRÁTICA 9/9',
    tab: 'history',
    title: 'Limpe a Tarefa de Teste do Histórico',
    subtitle: 'Mantenha seu espaço de trabalho impecável',
    description:
      'Como aquela era apenas uma tarefa de teste do tutorial, clique no ícone de Lixeira (🗑) ao lado da tarefa no histórico do Dale para excluí-la e deixar seu histórico 100% limpo para o seu uso real!',
    icon: Trash2,
    isMission: true,
    missionObjective:
      'Clique no ícone de lixeira ao lado da tarefa teste no Dale para removê-la e limpar o histórico.',
    missionTip:
      'Pronto! Seu ambiente agora está zerado e preparado para seu trabalho de verdade.',
    features: [
      'Exclusão definitiva ou desfeita com facilidade.',
      'Histórico limpo para começar do zero com metas reais.',
      'Contadores recalculados na hora.',
    ],
    previewType: 'dale_consistency',
  },

  // PASSO 16: TEÓRICO / CELEBRAÇÃO (Board)
  {
    id: 16,
    phaseNumber: 3,
    phaseName: 'TUTORIAL CONCLUÍDO!',
    tab: 'board',
    title: 'Você está Pronto! Bem-vindo ao Neon',
    subtitle: 'Domínio total das ferramentas de alta performance',
    description:
      'Sensacional! Você agora domina 100% dos recursos do Neon: das 5 colunas dinâmicas aos cronômetros, rotinas em bloco, visualização no calendário mensal e métricas no Dale. Sempre que quiser rever este guia, basta clicar no botão de Ajuda (?) no topo da tela.',
    icon: Sparkles,
    features: [
      'Domínio completo de todas as abas e atalhos.',
      'Botão permanente de Ajuda (?) no topo da tela.',
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

  // -------------------------------------------------------------
  // RENDER 1: FLOATING MISSION HUD (PRÁTICO) - Permite usar o app livremente!
  // -------------------------------------------------------------
  if (step.isMission) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl pointer-events-auto animate-spring-pop">
        <div className="relative rounded-2xl bg-[#0e081e]/95 border-2 border-cyan-400/80 shadow-2xl shadow-cyan-950/90 p-4 sm:p-5 text-slate-100 backdrop-blur-xl overflow-hidden tutorial-glow-btn">
          {/* Glowing Top Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500" />

          {/* Header: Phase badge + Step counter + Close button */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse flex items-center gap-1">
                <Target className="w-3 h-3 text-cyan-300" />
                <span>{step.phaseName}</span>
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
              className="p-1 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mission Objective Details */}
          <div className="flex items-start gap-3 mb-3.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 flex-shrink-0 animate-bounce-gentle">
              <StepIcon className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-white tracking-wide font-display">
                {step.title}
              </h3>
              <p className="text-xs text-cyan-200 mt-0.5 leading-relaxed font-semibold">
                {step.missionObjective}
              </p>
              {step.missionTip && (
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  💡 {step.missionTip}
                </p>
              )}
            </div>
          </div>

          {/* Progress bar in HUD */}
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={isFirst}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFinishTutorial}
                className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Pular
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-cyan-400 to-fuchsia-400 hover:from-cyan-300 hover:to-fuchsia-300 flex items-center gap-1.5 shadow-lg shadow-cyan-500/25 transition-transform active:scale-95 cursor-pointer tutorial-glow-btn"
              >
                <span>Concluir Missão / Avançar</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 2: FULL THEORETICAL MODAL (APRESENTAÇÃO EXPLICATIVA)
  // -------------------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
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
          <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
            {step.description}
          </p>

          {/* Interactive Visual Preview Mock */}
          <div className="p-3.5 rounded-xl bg-[#090514] border border-purple-500/30">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>Demonstração Visual:</span>
            </div>
            <VisualPreview previewType={step.previewType} />
          </div>

          {/* Bulleted Features List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Pontos-Chave:
            </h4>
            <div className="space-y-1.5">
              {step.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: Stepper dots + Navigation buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10 mt-4 flex-shrink-0">
          {/* Step dots (compact indicator) */}
          <div className="flex items-center gap-1">
            {TUTORIAL_STEPS.map((s, idx) => {
              const active = idx === currentStepIndex;
              const completed = idx < currentStepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  title={`Ir para passo ${s.id}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    active
                      ? 'w-5 bg-cyan-400'
                      : completed
                      ? 'w-2 bg-purple-500/80'
                      : 'w-1.5 bg-white/20'
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
              Parte 1 de 4
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((d, i) => (
              <span
                key={d}
                className={`flex-1 py-1 text-center rounded-md text-[10px] font-bold border transition-all ${
                  i < 2
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
