import { CustomLabel, TagColorItem } from './types';

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
  { name: string; hex: string }
> = {
  purple: { name: 'Prioridade Neon', hex: '#a855f7' },
  cyan: { name: 'Foco / Rotina', hex: '#06b6d4' },
  pink: { name: 'Edição / Vídeo', hex: '#d946ef' },
  green: { name: 'Prospecção / IDs', hex: '#10b981' },
  amber: { name: 'Urgente / Prazo', hex: '#f59e0b' },
  red: { name: 'Crítico / Bug', hex: '#ef4444' },
};

export function resolveLabelInfo(
  labelKey: string,
  customLabels?: CustomLabel[]
): { name: string; color: string } {
  const custom = customLabels?.find(
    (l) => l.id === labelKey || l.name === labelKey
  );
  if (custom) {
    return {
      name: custom.name,
      color: custom.color,
    };
  }
  const predefined = LABEL_CONFIG[labelKey];
  if (predefined) {
    return {
      name: predefined.name,
      color: predefined.hex,
    };
  }
  return {
    name: labelKey,
    color: '#3b82f6',
  };
}

export function isPriorityLabel(
  labelIdOrName: string,
  customLabels?: CustomLabel[]
): boolean {
  if (!labelIdOrName) return false;

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
