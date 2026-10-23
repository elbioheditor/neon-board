import { NeonStoreState, LabelColor, CustomLabel, TagColorItem } from '../types';
import { getTodayIsoDate, getTomorrowIsoDate } from '../utils/timeUtils';

const todayStr = getTodayIsoDate();
const tomorrowStr = getTomorrowIsoDate();

export const DEFAULT_CUSTOM_LABELS: CustomLabel[] = [
  { id: 'lbl-blue', name: 'Prioridade baixa', color: '#3b82f6' },
  { id: 'lbl-yellow', name: 'Prioridade média', color: '#eab308' },
  { id: 'lbl-red', name: 'Prioridade máxima', color: '#ef4444' },
];

export const DEFAULT_TAG_COLORS: TagColorItem[] = [
  { id: 'purple', name: 'Roxo', hex: '#a855f7' },
  { id: 'yellow', name: 'Amarelo', hex: '#eab308' },
  { id: 'red', name: 'Vermelho', hex: '#ef4444' },
  { id: 'green', name: 'Verde', hex: '#10b981' },
  { id: 'cyan', name: 'Ciano', hex: '#06b6d4' },
];

export const LABEL_CONFIG: Record<
  string,
  { name: string; bg: string; border: string; text: string; pillBg: string }
> = {
  purple: {
    name: 'Prioridade Neon',
    bg: 'bg-purple-500',
    border: 'border-purple-400/50',
    text: 'text-purple-300',
    pillBg: 'bg-purple-500/20',
  },
  cyan: {
    name: 'Foco / Rotina',
    bg: 'bg-cyan-400',
    border: 'border-cyan-400/50',
    text: 'text-cyan-300',
    pillBg: 'bg-cyan-500/20',
  },
  pink: {
    name: 'Edição / Vídeo',
    bg: 'bg-fuchsia-500',
    border: 'border-fuchsia-400/50',
    text: 'text-fuchsia-300',
    pillBg: 'bg-fuchsia-500/20',
  },
  green: {
    name: 'Prospecção / IDs',
    bg: 'bg-emerald-400',
    border: 'border-emerald-400/50',
    text: 'text-emerald-300',
    pillBg: 'bg-emerald-500/20',
  },
  yellow: {
    name: 'Estudo / Método',
    bg: 'bg-amber-300',
    border: 'border-amber-300/50',
    text: 'text-amber-200',
    pillBg: 'bg-amber-400/20',
  },
  orange: {
    name: 'Social / Criação',
    bg: 'bg-orange-400',
    border: 'border-orange-400/50',
    text: 'text-orange-300',
    pillBg: 'bg-orange-500/20',
  },
  'lbl-blue': {
    name: 'Prioridade baixa',
    bg: 'bg-blue-500',
    border: 'border-blue-400/50',
    text: 'text-blue-300',
    pillBg: 'bg-blue-500/20',
  },
  'lbl-yellow': {
    name: 'Prioridade média',
    bg: 'bg-amber-400',
    border: 'border-amber-300/50',
    text: 'text-amber-200',
    pillBg: 'bg-amber-400/20',
  },
  'lbl-red': {
    name: 'Prioridade máxima',
    bg: 'bg-rose-500',
    border: 'border-rose-400/50',
    text: 'text-rose-300',
    pillBg: 'bg-rose-500/20',
  },
};

export function resolveLabelInfo(
  labelKey: string,
  customLabels?: CustomLabel[]
): { name: string; color: string; bgClass: string; isHex: boolean } {
  const custom = customLabels?.find(
    (l) => l.id === labelKey || l.name === labelKey
  );
  if (custom) {
    return {
      name: custom.name,
      color: custom.color,
      bgClass: '',
      isHex: true,
    };
  }
  const predefined = LABEL_CONFIG[labelKey];
  if (predefined) {
    return {
      name: predefined.name,
      color: '',
      bgClass: predefined.bg,
      isHex: false,
    };
  }
  return {
    name: labelKey,
    color: '#3b82f6',
    bgClass: 'bg-blue-500',
    isHex: false,
  };
}

export function isPriorityLabel(
  labelIdOrName: string,
  customLabels?: CustomLabel[]
): boolean {
  if (!labelIdOrName) return false;

  // When customLabels is provided, check if it exists in the active labels list
  if (customLabels) {
    const custom = customLabels.find(
      (l) => l.id === labelIdOrName || l.name === labelIdOrName
    );
    if (custom) {
      if (['lbl-blue', 'lbl-yellow', 'lbl-red'].includes(custom.id)) {
        return true;
      }
      const cleanName = custom.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (
        cleanName.includes('prioridade') ||
        cleanName.includes('priority') ||
        cleanName === 'alta' ||
        cleanName === 'baixa' ||
        cleanName === 'media' ||
        cleanName === 'urgente' ||
        cleanName === 'maxima'
      ) {
        return true;
      }
    }
    return false;
  }

  // Default priority label IDs if customLabels is not passed
  if (['lbl-blue', 'lbl-yellow', 'lbl-red'].includes(labelIdOrName)) {
    return true;
  }

  const predefined = LABEL_CONFIG[labelIdOrName];
  if (predefined) {
    const cleanName = predefined.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (cleanName.includes('prioridade') || cleanName.includes('priority')) {
      return true;
    }
  }

  return false;
}

export function sanitizeCardLabels(
  labels: string[] = [],
  customLabels?: CustomLabel[]
): string[] {
  if (!Array.isArray(labels)) return [];
  let foundPriority = false;
  const sanitized: string[] = [];

  // Traverse backwards to preserve the most recent priority label if multiple were present
  for (let i = labels.length - 1; i >= 0; i--) {
    const id = labels[i];
    if (isPriorityLabel(id, customLabels)) {
      if (!foundPriority) {
        sanitized.unshift(id);
        foundPriority = true;
      }
    } else {
      sanitized.unshift(id);
    }
  }

  return sanitized;
}

export function toggleLabelSelection(
  currentLabels: string[],
  labelId: string,
  customLabels?: CustomLabel[]
): string[] {
  const isPriority = isPriorityLabel(labelId, customLabels);
  const exists = currentLabels.includes(labelId);

  if (exists) {
    const remaining = currentLabels.filter((id) => id !== labelId);
    return sanitizeCardLabels(remaining, customLabels);
  }

  if (isPriority) {
    const nonPriorityLabels = currentLabels.filter(
      (id) => !isPriorityLabel(id, customLabels)
    );
    return [...nonPriorityLabels, labelId];
  }

  return [...currentLabels, labelId];
}


export const INITIAL_STATE: NeonStoreState = {
  activeBoardId: 'elbioh-board',
  lastUpdated: '1970-01-01T00:00:00.000Z',
  customLabels: DEFAULT_CUSTOM_LABELS,
  tagColors: DEFAULT_TAG_COLORS,
  boards: [
    {
      id: 'elbioh-board',
      name: "Elbioh's Board",
      owner: 'Elbioh',
      subtitle: 'Rotina Diária, Edição & Prospecção',
      accentFrom: '#c026d3',
      accentTo: '#06b6d4',
    },
  ],
  lists: [
    // Elbioh's Lists (Yesterday -> Today -> Tomorrow -> This Week -> Future)
    { id: 'elbioh-yesterday', boardId: 'elbioh-board', title: 'Yesterday', order: 0 },
    { id: 'elbioh-today', boardId: 'elbioh-board', title: 'Today', order: 1 },
    { id: 'elbioh-tomorrow', boardId: 'elbioh-board', title: 'Tomorrow', order: 2 },
    { id: 'elbioh-week', boardId: 'elbioh-board', title: 'This Week', order: 3 },
    { id: 'elbioh-future', boardId: 'elbioh-board', title: 'Future', order: 4 },
  ],
  cards: [
    // ELBIOH - TODAY (Ordered from Morning 09:00 to Night 20:30)
    {
      id: 'card-el-1',
      boardId: 'elbioh-board',
      listId: 'elbioh-today',
      title: 'ver as 4 lives do sobral',
      description: 'Anotar os principais pontos de tráfego e prospecção para aplicar na rotina.',
      status: 'todo',
      startTime: '09:00',
      endTime: '11:00',
      scheduledDate: todayStr,
      elapsedSeconds: 0,
      labels: ['yellow', 'purple'],
      categoryTag: 'ESTUDO',
      checklist: [
        { id: 'chk-1', text: 'Assistir Live 1 e 2 com anotações', completed: true },
        { id: 'chk-2', text: 'Assistir Live 3 e 4 e resumir', completed: false },
      ],
      assignee: 'Elbioh',
      createdAt: new Date().toISOString(),
      order: 0,
    },
    {
      id: 'card-el-2',
      boardId: 'elbioh-board',
      listId: 'elbioh-today',
      title: 'ad 20 ids per day',
      description: 'Bloco da manhã de mapeamento e adição de 20 novos IDs qualificados.',
      status: 'todo',
      startTime: '11:00',
      endTime: '12:00',
      scheduledDate: todayStr,
      elapsedSeconds: 0,
      labels: ['green'],
      categoryTag: 'PROSPECÇÃO',
      checklist: [],
      assignee: 'Elbioh',
      createdAt: new Date().toISOString(),
      order: 1,
    },
    {
      id: 'card-el-3',
      boardId: 'elbioh-board',
      listId: 'elbioh-today',
      title: 'Ajustar mensagens de e-mail, para nao ter links. Twitter também.',
      description: 'Remover links diretos no primeiro contato para melhorar entregabilidade e taxa de resposta.',
      status: 'todo',
      startTime: '13:30',
      endTime: '14:30',
      scheduledDate: todayStr,
      elapsedSeconds: 0,
      labels: ['green', 'cyan'],
      categoryTag: 'OUTREACH',
      checklist: [
        { id: 'chk-3', text: 'Revisar template de E-mail', completed: false },
        { id: 'chk-4', text: 'Revisar script de DM do Twitter/X', completed: false },
      ],
      assignee: 'Elbioh',
      createdAt: new Date().toISOString(),
      order: 2,
    },
    {
      id: 'card-el-4',
      boardId: 'elbioh-board',
      listId: 'elbioh-today',
      title: 'ad 20 ids per day (2º bloco)',
      description: 'Segundo bloco do dia para bater a meta consistente de IDs.',
      status: 'todo',
      startTime: '15:00',
      endTime: '16:00',
      scheduledDate: todayStr,
      elapsedSeconds: 0,
      labels: ['orange'],
      categoryTag: 'PROSPECÇÃO',
      checklist: [],
      assignee: 'Elbioh',
      createdAt: new Date().toISOString(),
      order: 3,
    },
    {
      id: 'card-el-5',
      boardId: 'elbioh-board',
      listId: 'elbioh-today',
      title: 'Criar os Banners Reais para Discord e Twitter',
      description: 'Manter a identidade visual Neon (Roxo & Azul Ciano) alinhada com o site elbioheditor.',
      status: 'todo',
      startTime: '16:30',
      endTime: '18:00',
      scheduledDate: todayStr,
      elapsedSeconds: 0,
      labels: ['orange', 'purple'],
      categoryTag: 'DESIGN',
      checklist: [],
      assignee: 'Elbioh',
      createdAt: new Date().toISOString(),
      order: 4,
    },
    {
      id: 'card-el-6',
      boardId: 'elbioh-board',
      listId: 'elbioh-today',
      title: 'Adicionar novos vídeos no portfólio',
      description: 'Atualizar a seção Selected Projects do site com os cortes mais recentes.',
      status: 'todo',
      startTime: '19:00',
      endTime: '20:00',
      scheduledDate: todayStr,
      elapsedSeconds: 0,
      labels: ['orange', 'pink'],
      categoryTag: 'PORTFÓLIO',
      checklist: [],
      assignee: 'Elbioh',
      createdAt: new Date().toISOString(),
      order: 5,
    },
    {
      id: 'card-el-7',
      boardId: 'elbioh-board',
      listId: 'elbioh-today',
      title: 'Aprender as regras do futebol americano',
      description: 'Estudar descidas (downs), pontuação e jogadas principais para dominar edições de NFL / Madden.',
      status: 'todo',
      startTime: '20:30',
      endTime: '21:30',
      scheduledDate: todayStr,
      elapsedSeconds: 0,
      labels: ['orange', 'cyan'],
      categoryTag: 'NFL / EDIT',
      checklist: [],
      assignee: 'Elbioh',
      createdAt: new Date().toISOString(),
      order: 6,
    },

    // ELBIOH - THIS WEEK (Synchronized with upcoming days of the week)
    {
      id: 'card-el-8',
      boardId: 'elbioh-board',
      listId: 'elbioh-week',
      title: 'ad 120 ids per week',
      description: 'Meta semanal acumulada de prospecção ativa.',
      status: 'todo',
      startTime: '10:00',
      endTime: '11:30',
      scheduledDate: tomorrowStr,
      elapsedSeconds: 0,
      labels: ['yellow', 'green'],
      categoryTag: 'META SEMANAL',
      checklist: [
        { id: 'chk-w1', text: 'Seg-Qua: 60 IDs', completed: true },
        { id: 'chk-w2', text: 'Qui-Sáb: 60 IDs', completed: false },
      ],
      assignee: 'Elbioh',
      createdAt: new Date().toISOString(),
      order: 0,
    },
    {
      id: 'card-el-9',
      boardId: 'elbioh-board',
      listId: 'elbioh-week',
      title: 'Fazer 1 post no twitter',
      description: 'Postar breakdown ou antes/depois de edição mostrando sound design e retenção.',
      status: 'todo',
      startTime: '14:00',
      endTime: '15:00',
      scheduledDate: tomorrowStr,
      elapsedSeconds: 0,
      labels: ['orange'],
      categoryTag: 'TWITTER / X',
      checklist: [],
      assignee: 'Elbioh',
      createdAt: new Date().toISOString(),
      order: 1,
    },
    {
      id: 'card-el-10',
      boardId: 'elbioh-board',
      listId: 'elbioh-week',
      title: 'ter um método para prospectar',
      description: 'Estruturar funil diário entre Elbioh e Didi para organizar leads e follow-ups.',
      status: 'todo',
      startTime: '16:00',
      endTime: '17:30',
      scheduledDate: tomorrowStr,
      elapsedSeconds: 0,
      labels: ['yellow', 'cyan'],
      categoryTag: 'PROCESSO',
      checklist: [],
      assignee: 'Didi',
      createdAt: new Date().toISOString(),
      order: 2,
    },
    {
      id: 'card-el-11',
      boardId: 'elbioh-board',
      listId: 'elbioh-week',
      title: 'Fazer o teste para o Wheel of MUT',
      description: 'High-energy NFL Madden gameplay edit featuring fast-paced cuts & dynamic tracking.',
      status: 'todo',
      startTime: '18:00',
      endTime: '20:30',
      scheduledDate: tomorrowStr,
      elapsedSeconds: 0,
      labels: ['orange', 'purple'],
      categoryTag: 'EDIÇÃO',
      checklist: [],
      assignee: 'Elbioh',
      createdAt: new Date().toISOString(),
      order: 3,
    },
  ],
};
