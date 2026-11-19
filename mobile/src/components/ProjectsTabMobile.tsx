import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TaskCard, ThemeColors, WorkProject } from '../core/types';
import {
  formatDurationHuman,
  formatStopwatch,
  getBrasiliaYearMonth,
  getLiveElapsedSeconds,
} from '../core/timeUtils';

export function formatUsd(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `$${safe.toFixed(2)}`;
}

export function formatBrl(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `R$ ${safe.toFixed(2).replace('.', ',')}`;
}

export function getProjectTotalSeconds(
  project: WorkProject,
  allCards: TaskCard[],
  nowMs: number
): number {
  const linkedSeconds = allCards
    .filter((c) => c.projectId === project.id)
    .reduce((acc, c) => acc + getLiveElapsedSeconds(c, nowMs), 0);
  return Math.max(0, (project.manualSeconds || 0) + linkedSeconds);
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

interface ProjectsTabMobileProps {
  boardId: string;
  boardName: string;
  projects: WorkProject[];
  clients: string[];
  cards: TaskCard[];
  nowMs: number;
  usdToBrlRate: number;
  themeColors: ThemeColors;
  onUpdateUsdToBrlRate: (rate: number) => void;
  onAddClient: (clientName: string) => void;
  onDeleteClient: (clientName: string) => void;
  onCreateProject: (data: {
    title: string;
    clientName: string;
    description?: string;
    amountUsd: number;
    color?: string;
  }) => void;
  onUpdateProject: (updated: WorkProject) => void;
  onCompleteProject: (projectId: string) => void;
  onRestoreProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onAssignCardProject: (cardId: string, projectId: string | undefined) => void;
}

export const ProjectsTabMobile: React.FC<ProjectsTabMobileProps> = ({
  boardId,
  boardName,
  projects,
  clients,
  cards,
  nowMs,
  usdToBrlRate,
  themeColors,
  onUpdateUsdToBrlRate,
  onAddClient,
  onDeleteClient,
  onCreateProject,
  onUpdateProject,
  onCompleteProject,
  onRestoreProject,
  onDeleteProject,
  onAssignCardProject,
}) => {
  const primaryColor = themeColors.primaryColor || '#a855f7';
  const secondaryColor = themeColors.secondaryColor || '#06b6d4';

  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() =>
    getBrasiliaYearMonth()
  );

  // Create project form state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClientName, setNewClientName] = useState<string>(
    () => clients[0] || 'Brody'
  );
  const [newAmountUsd, setNewAmountUsd] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);

  // Client manager state
  const [isManagingClients, setIsManagingClients] = useState(false);
  const [newClientInput, setNewClientInput] = useState('');

  // Full project edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editAmountUsd, setEditAmountUsd] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState(PROJECT_COLORS[0]);

  // Quick inline value ($ USD) edit state
  const [editingValueProjectId, setEditingValueProjectId] = useState<
    string | null
  >(null);
  const [valueInputUsd, setValueInputUsd] = useState('');

  // Manual hours add / subtract / override state
  const [adjustingHoursProjectId, setAdjustingHoursProjectId] = useState<
    string | null
  >(null);
  const [hoursInputH, setHoursInputH] = useState('');
  const [hoursInputM, setHoursInputM] = useState('');

  // Task linker state
  const [linkingProjectId, setLinkingProjectId] = useState<string | null>(null);

  // Deliberate 2-step Trash Delete Confirmation Modal (prevents accidental 1-tap delete)
  const [confirmDeleteProject, setConfirmDeleteProject] =
    useState<WorkProject | null>(null);

  // Exchange rate live fetch & edit state
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(usdToBrlRate || 5.8));

  useEffect(() => {
    setRateInput(String(usdToBrlRate || 5.8));
  }, [usdToBrlRate]);

  const fetchLiveUsdBrlRate = async () => {
    try {
      const res = await fetch(
        'https://economia.awesomeapi.com.br/json/last/USD-BRL'
      );
      if (res.ok) {
        const data = await res.json();
        const bid = parseFloat(data?.USDBRL?.bid);
        if (!isNaN(bid) && bid > 1) {
          onUpdateUsdToBrlRate(Math.round(bid * 100) / 100);
        }
      }
    } catch {
      // keep existing rate if offline
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

  const monthlyMetrics = useMemo(() => {
    const completedUsd = completedProjectsForMonth.reduce(
      (acc, p) => acc + (Number(p.amountUsd) || 0),
      0
    );
    const completedBrl = completedUsd * usdToBrlRate;
    const completedSeconds = completedProjectsForMonth.reduce(
      (acc, p) => acc + getProjectTotalSeconds(p, boardCards, nowMs),
      0
    );

    const activeUsd = activeProjects.reduce(
      (acc, p) => acc + (Number(p.amountUsd) || 0),
      0
    );
    const activeBrl = activeUsd * usdToBrlRate;
    const activeSeconds = activeProjects.reduce(
      (acc, p) => acc + getProjectTotalSeconds(p, boardCards, nowMs),
      0
    );

    const totalSecondsInMonth = completedSeconds + activeSeconds;
    const totalHoursCompleted = completedSeconds / 3600;
    const totalHoursAll = totalSecondsInMonth / 3600;

    let avgHourlyUsd = 0;
    if (completedUsd > 0 && totalHoursCompleted > 0) {
      avgHourlyUsd = completedUsd / totalHoursCompleted;
    } else if (totalHoursAll > 0) {
      const projectsWithHoursUsd = [
        ...completedProjectsForMonth,
        ...activeProjects,
      ]
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

  const handleCreateSubmit = () => {
    const trimmedTitle = newTitle.trim();
    const trimmedClient = newClientName.trim();
    if (!trimmedTitle || !trimmedClient) return;
    const parsedUsd = parseFloat(newAmountUsd.replace(',', '.')) || 0;
    onCreateProject({
      title: trimmedTitle,
      clientName: trimmedClient,
      description: newDescription.trim() || undefined,
      amountUsd: Math.max(0, parsedUsd),
      color: newColor,
    });
    setNewTitle('');
    setNewAmountUsd('');
    setNewDescription('');
    setIsCreating(false);
  };

  const openEditValue = (project: WorkProject) => {
    if (editingValueProjectId === project.id) {
      setEditingValueProjectId(null);
      return;
    }
    setEditingValueProjectId(project.id);
    setValueInputUsd(String(project.amountUsd ?? 0));
  };

  const saveQuickValue = (project: WorkProject) => {
    const parsedUsd = parseFloat(valueInputUsd.replace(',', '.'));
    if (isNaN(parsedUsd) || parsedUsd < 0) return;
    onUpdateProject({
      ...project,
      amountUsd: Math.max(0, parsedUsd),
    });
    setEditingValueProjectId(null);
  };

  const openAdjustHours = (project: WorkProject) => {
    if (adjustingHoursProjectId === project.id) {
      setAdjustingHoursProjectId(null);
      return;
    }
    setAdjustingHoursProjectId(project.id);
    setHoursInputH('');
    setHoursInputM('');
  };

  const isSubtractingHours =
    hoursInputH.trim().startsWith('-') || hoursInputM.trim().startsWith('-');

  const handleAddManualHours = (project: WorkProject) => {
    const rawH = hoursInputH.trim();
    const rawM = hoursInputM.trim();
    const isNegative = rawH.startsWith('-') || rawM.startsWith('-');
    const absH = Math.abs(parseFloat(rawH.replace(',', '.')) || 0);
    const absM = Math.abs(parseFloat(rawM.replace(',', '.')) || 0);
    const totalSecs = Math.round(absH * 3600 + absM * 60);
    if (totalSecs === 0) return;
    const deltaSecs = isNegative ? -totalSecs : totalSecs;
    onUpdateProject({
      ...project,
      manualSeconds: (project.manualSeconds || 0) + deltaSecs,
    });
    setHoursInputH('');
    setHoursInputM('');
    setAdjustingHoursProjectId(null);
  };

  const handleSetTotalHours = (project: WorkProject) => {
    const h = Math.max(0, parseFloat(hoursInputH.replace(',', '.')) || 0);
    const m = Math.max(0, parseFloat(hoursInputM.replace(',', '.')) || 0);
    const targetSecs = Math.round(h * 3600 + m * 60);
    const linkedSeconds = boardCards
      .filter((c) => c.projectId === project.id)
      .reduce((acc, c) => acc + getLiveElapsedSeconds(c, nowMs), 0);
    onUpdateProject({
      ...project,
      manualSeconds: targetSecs - linkedSeconds,
    });
    setHoursInputH('');
    setHoursInputM('');
    setAdjustingHoursProjectId(null);
  };

  const handleResetManualHours = (project: WorkProject) => {
    onUpdateProject({
      ...project,
      manualSeconds: 0,
    });
    setHoursInputH('');
    setHoursInputM('');
    setAdjustingHoursProjectId(null);
  };

  const startEditing = (project: WorkProject) => {
    setEditingId(project.id);
    setEditTitle(project.title);
    setEditClientName(project.clientName || 'Brody');
    setEditAmountUsd(String(project.amountUsd || 0));
    setEditDescription(project.description || '');
    setEditColor(project.color || PROJECT_COLORS[0]);
  };

  const saveEdit = (project: WorkProject) => {
    const trimmed = editTitle.trim();
    const trimmedClient = editClientName.trim();
    if (!trimmed || !trimmedClient) return;
    const parsedUsd = parseFloat(editAmountUsd.replace(',', '.')) || 0;
    onAddClient(trimmedClient);
    onUpdateProject({
      ...project,
      title: trimmed,
      clientName: trimmedClient,
      description: editDescription.trim() || undefined,
      amountUsd: Math.max(0, parsedUsd),
      color: editColor,
    });
    setEditingId(null);
  };

  const renderHoursAdjustPanel = (project: WorkProject) => {
    if (adjustingHoursProjectId !== project.id) return null;
    return (
      <View style={styles.adjustBox}>
        <View style={styles.adjustHeader}>
          <Text style={[styles.adjustTitle, { color: secondaryColor }]}>
            ADICIONAR, SUBTRAIR OU DEFINIR HORAS
          </Text>
          <Pressable onPress={() => setAdjustingHoursProjectId(null)}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.hoursInputRow}>
          <View style={styles.hourFieldWrap}>
            <TextInput
              style={styles.hourInput}
              placeholder="0 (ou -1)"
              placeholderTextColor="#64748b"
              value={hoursInputH}
              onChangeText={setHoursInputH}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.unitText}>h</Text>
          </View>
          <View style={styles.hourFieldWrap}>
            <TextInput
              style={styles.hourInput}
              placeholder="30 (ou -30)"
              placeholderTextColor="#64748b"
              value={hoursInputM}
              onChangeText={setHoursInputM}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.unitText}>min</Text>
          </View>
        </View>

        <View style={styles.adjustBtnsRow}>
          <Pressable
            onPress={() => handleAddManualHours(project)}
            style={[
              styles.adjustActionBtn,
              isSubtractingHours
                ? styles.subtractHoursBtn
                : {
                    backgroundColor: `${primaryColor}35`,
                    borderColor: primaryColor,
                  },
            ]}
          >
            <Text style={styles.adjustActionText}>
              {isSubtractingHours ? '- Subtrair Horas' : '+ Somar Horas'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleSetTotalHours(project)}
            style={[
              styles.adjustActionBtn,
              {
                backgroundColor: `${secondaryColor}28`,
                borderColor: secondaryColor,
              },
            ]}
          >
            <Text style={[styles.adjustActionText, { color: '#e0f2fe' }]}>
              = Definir Total
            </Text>
          </Pressable>

          {(project.manualSeconds || 0) !== 0 && (
            <Pressable
              onPress={() => handleResetManualHours(project)}
              style={styles.resetHoursBtn}
            >
              <Text style={styles.resetHoursText}>Zerar</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderValueBadgeOrEditor = (project: WorkProject) => {
    if (editingValueProjectId === project.id) {
      return (
        <View style={styles.valueEditorBox}>
          <View style={styles.valueEditorRow}>
            <Text style={styles.dollarPrefix}>$</Text>
            <TextInput
              style={styles.valueEditorInput}
              value={valueInputUsd}
              onChangeText={setValueInputUsd}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Pressable
              onPress={() => saveQuickValue(project)}
              style={styles.saveValueBtn}
            >
              <Text style={styles.saveValueBtnText}>✓</Text>
            </Pressable>
            <Pressable
              onPress={() => setEditingValueProjectId(null)}
              style={styles.cancelValueBtn}
            >
              <Text style={styles.cancelValueBtnText}>✕</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={{ alignItems: 'flex-end' }}>
        <Pressable
          onPress={() => openEditValue(project)}
          style={styles.valueBadgeBtn}
        >
          <Text style={styles.valueBadgeUsd}>
            {formatUsd(project.amountUsd || 0)} ✏️
          </Text>
        </Pressable>
        <Text style={styles.valueBadgeBrl}>
          {formatBrl((project.amountUsd || 0) * usdToBrlRate)}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
    >
      {/* Top Header Card */}
      <View
        style={[
          styles.headerCard,
          { borderColor: `${primaryColor}45` },
        ]}
      >
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              💼 Projetos & Ganhos — {boardName}
            </Text>
            <Text style={styles.headerSubtitle}>
              Toque no valor ($) para alterar o preço ou em + Horas para somar e
              subtrair horas
            </Text>
          </View>

          {/* USD -> BRL Exchange Rate Pill */}
          <View style={styles.ratePill}>
            <Text style={styles.rateLabel}>USD:</Text>
            {isEditingRate ? (
              <View style={styles.rateEditRow}>
                <TextInput
                  style={styles.rateInput}
                  value={rateInput}
                  onChangeText={setRateInput}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Pressable
                  onPress={() => {
                    const val = parseFloat(rateInput.replace(',', '.'));
                    if (!isNaN(val) && val > 0) {
                      onUpdateUsdToBrlRate(val);
                    }
                    setIsEditingRate(false);
                  }}
                  style={styles.rateSaveBtn}
                >
                  <Text style={styles.rateSaveText}>✓</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setIsEditingRate(true)}>
                <Text style={styles.rateValueText}>
                  R$ {usdToBrlRate.toFixed(2)} ✏️
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Month Selector + Actions Row */}
        <View style={styles.headerControlsRow}>
          <View style={styles.monthSelector}>
            <Pressable onPress={handlePrevMonth} style={styles.monthNavBtn}>
              <Text style={styles.monthNavText}>◀</Text>
            </Pressable>
            <Text style={styles.monthLabelText}>{formattedMonthLabel}</Text>
            <Pressable onPress={handleNextMonth} style={styles.monthNavBtn}>
              <Text style={styles.monthNavText}>▶</Text>
            </Pressable>
          </View>

          <View style={styles.headerBtnsRow}>
            <Pressable
              onPress={() => setIsManagingClients((v) => !v)}
              style={[
                styles.clientsBtn,
                isManagingClients && {
                  borderColor: secondaryColor,
                  backgroundColor: `${secondaryColor}25`,
                },
              ]}
            >
              <Text style={styles.clientsBtnText}>
                👥 Clientes ({clients.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!newClientName && clients.length > 0) {
                  setNewClientName(clients[0]);
                }
                setIsCreating((v) => !v);
              }}
              style={[
                styles.newProjectBtn,
                { backgroundColor: primaryColor },
              ]}
            >
              <Text style={styles.newProjectBtnText}>+ Novo Projeto</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Client Manager Drawer */}
      {isManagingClients && (
        <View
          style={[
            styles.drawerCard,
            { borderColor: secondaryColor },
          ]}
        >
          <View style={styles.drawerHeader}>
            <Text style={[styles.drawerTitle, { color: secondaryColor }]}>
              👥 CLIENTES CADASTRADOS
            </Text>
            <Pressable onPress={() => setIsManagingClients(false)}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.clientsPillsWrap}>
            {clients.map((cl) => (
              <View key={cl} style={styles.clientChip}>
                <Text style={styles.clientChipText}>👤 {cl}</Text>
                {clients.length > 1 && (
                  <Pressable onPress={() => onDeleteClient(cl)}>
                    <Text style={styles.clientChipRemove}>×</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          <View style={styles.addClientRow}>
            <TextInput
              style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
              placeholder="Novo cliente (ex: Brody...)"
              placeholderTextColor="#64748b"
              value={newClientInput}
              onChangeText={setNewClientInput}
            />
            <Pressable
              onPress={() => {
                const trimmed = newClientInput.trim();
                if (!trimmed) return;
                onAddClient(trimmed);
                setNewClientName(trimmed);
                setNewClientInput('');
              }}
              style={[
                styles.addClientConfirmBtn,
                { backgroundColor: secondaryColor },
              ]}
            >
              <Text style={styles.addClientConfirmText}>+ Adicionar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Create New Project Drawer */}
      {isCreating && (
        <View
          style={[
            styles.drawerCard,
            { borderColor: secondaryColor },
          ]}
        >
          <View style={styles.drawerHeader}>
            <Text style={[styles.drawerTitle, { color: '#ffffff' }]}>
              ✨ CRIAR NOVO PROJETO DE TRABALHO
            </Text>
            <Pressable onPress={() => setIsCreating(false)}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>TÍTULO DO PROJETO *</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Ex: Edição de Vídeo NFL"
            placeholderTextColor="#64748b"
            value={newTitle}
            onChangeText={setNewTitle}
          />

          <Text style={[styles.fieldLabel, { color: secondaryColor }]}>
            CLIENTE DO PROJETO * (OBRIGATÓRIO)
          </Text>
          <TextInput
            style={[
              styles.inputField,
              { borderColor: `${secondaryColor}70` },
            ]}
            placeholder="Selecione abaixo ou digite o cliente..."
            placeholderTextColor="#64748b"
            value={newClientName}
            onChangeText={setNewClientName}
          />
          <View style={styles.clientsPillsWrap}>
            {clients.map((cl) => {
              const isSelected =
                newClientName.trim().toLowerCase() === cl.toLowerCase();
              return (
                <Pressable
                  key={cl}
                  onPress={() => setNewClientName(cl)}
                  style={[
                    styles.clientSelectPill,
                    isSelected && {
                      backgroundColor: `${secondaryColor}35`,
                      borderColor: secondaryColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.clientSelectText,
                      isSelected && { color: '#ffffff', fontWeight: '900' },
                    ]}
                  >
                    👤 {cl}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: '#34d399', marginTop: 8 }]}>
            VALOR DO PROJETO (USD $) *
          </Text>
          <TextInput
            style={[
              styles.inputField,
              { borderColor: 'rgba(16, 185, 129, 0.5)', color: '#6ee7b7' },
            ]}
            placeholder="150.00"
            placeholderTextColor="#64748b"
            value={newAmountUsd}
            onChangeText={setNewAmountUsd}
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>DESCRIÇÃO (OPCIONAL)</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Detalhes, entregáveis..."
            placeholderTextColor="#64748b"
            value={newDescription}
            onChangeText={setNewDescription}
          />

          <View style={styles.colorRowAndSubmit}>
            <View style={styles.colorDotsRow}>
              {PROJECT_COLORS.map((hex) => (
                <Pressable
                  key={hex}
                  onPress={() => setNewColor(hex)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: hex },
                    newColor === hex && styles.colorDotSelected,
                  ]}
                />
              ))}
            </View>

            <Pressable
              onPress={handleCreateSubmit}
              style={styles.submitProjectBtn}
            >
              <Text style={styles.submitProjectText}>Criar Projeto</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 4 KPI Summary Cards (2x2 Grid) */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { borderColor: 'rgba(16,185,129,0.4)' }]}>
          <Text style={[styles.kpiLabel, { color: '#6ee7b7' }]}>
            GANHOS NO MÊS
          </Text>
          <Text style={[styles.kpiMainValue, { color: '#34d399' }]}>
            {formatUsd(monthlyMetrics.completedUsd)}
          </Text>
          <Text style={styles.kpiSubValue}>
            {formatBrl(monthlyMetrics.completedBrl)} •{' '}
            {completedProjectsForMonth.length} concl.
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            { borderColor: `${secondaryColor}60` },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: secondaryColor }]}>
            VALOR DA HORA MÉDIA
          </Text>
          <Text style={[styles.kpiMainValue, { color: secondaryColor }]}>
            {formatUsd(monthlyMetrics.avgHourlyUsd)}/h
          </Text>
          <Text style={styles.kpiSubValue}>
            {formatBrl(monthlyMetrics.avgHourlyBrl)}/h
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            { borderColor: `${primaryColor}60` },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: '#d8b4fe' }]}>
            EM ANDAMENTO ({activeProjects.length})
          </Text>
          <Text style={[styles.kpiMainValue, { color: '#e9d5ff' }]}>
            {formatUsd(monthlyMetrics.activeUsd)}
          </Text>
          <Text style={styles.kpiSubValue}>
            {formatBrl(monthlyMetrics.activeBrl)}
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            { borderColor: 'rgba(217, 70, 239, 0.45)' },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: '#f0abfc' }]}>
            HORAS NOS PROJETOS
          </Text>
          <Text style={[styles.kpiMainValue, { color: '#ffffff' }]}>
            {formatStopwatch(monthlyMetrics.totalSecondsInMonth)}
          </Text>
          <Text style={styles.kpiSubValue}>
            Concl: {formatDurationHuman(monthlyMetrics.completedSeconds)}
          </Text>
        </View>
      </View>

      {/* ACTIVE PROJECTS SECTION */}
      <Text style={[styles.sectionHeaderTitle, { color: secondaryColor }]}>
        PROJETOS TRABALHANDO AGORA ({activeProjects.length})
      </Text>

      {activeProjects.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyBoxTitle}>Nenhum projeto ativo</Text>
          <Text style={styles.emptyBoxSub}>
            Toque em "+ Novo Projeto" acima para criar um projeto com cliente e
            valor em dólares ($).
          </Text>
        </View>
      ) : (
        activeProjects.map((project) => {
          const linkedCards = boardCards.filter(
            (c) => c.projectId === project.id
          );
          const totalSecs = getProjectTotalSeconds(project, boardCards, nowMs);
          const hoursFloat = totalSecs / 3600;
          const effectiveUsdPerHour =
            hoursFloat > 0 ? (project.amountUsd || 0) / hoursFloat : 0;
          const isEditing = editingId === project.id;
          const accentColor = project.color || primaryColor;

          return (
            <View
              key={project.id}
              style={[
                styles.projectCard,
                {
                  borderTopColor: accentColor,
                  borderTopWidth: 3,
                },
              ]}
            >
              {isEditing ? (
                <View>
                  <Text style={styles.fieldLabel}>TÍTULO *</Text>
                  <TextInput
                    style={styles.inputField}
                    value={editTitle}
                    onChangeText={setEditTitle}
                  />
                  <Text style={styles.fieldLabel}>CLIENTE *</Text>
                  <TextInput
                    style={styles.inputField}
                    value={editClientName}
                    onChangeText={setEditClientName}
                  />
                  <View style={styles.clientsPillsWrap}>
                    {clients.map((cl) => (
                      <Pressable
                        key={cl}
                        onPress={() => setEditClientName(cl)}
                        style={[
                          styles.clientSelectPill,
                          editClientName.trim().toLowerCase() ===
                            cl.toLowerCase() && {
                            borderColor: secondaryColor,
                            backgroundColor: `${secondaryColor}30`,
                          },
                        ]}
                      >
                        <Text style={styles.clientSelectText}>👤 {cl}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={[styles.fieldLabel, { marginTop: 8 }]}>
                    VALOR (USD $)
                  </Text>
                  <TextInput
                    style={styles.inputField}
                    value={editAmountUsd}
                    onChangeText={setEditAmountUsd}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.fieldLabel}>DESCRIÇÃO</Text>
                  <TextInput
                    style={styles.inputField}
                    value={editDescription}
                    onChangeText={setEditDescription}
                  />
                  <View style={styles.editFooterRow}>
                    <Pressable
                      onPress={() => setEditingId(null)}
                      style={styles.cancelEditBtn}
                    >
                      <Text style={styles.cancelEditText}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => saveEdit(project)}
                      style={styles.saveEditBtn}
                    >
                      <Text style={styles.saveEditText}>Salvar</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  {/* Card Top Row */}
                  <View style={styles.projectTopRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={styles.projectTitleRow}>
                        <View
                          style={[
                            styles.projectDot,
                            { backgroundColor: accentColor },
                          ]}
                        />
                        <Text style={styles.projectTitleText}>
                          {project.title}
                        </Text>
                        <View style={styles.clientBadge}>
                          <Text style={styles.clientBadgeText}>
                            👤 {project.clientName || 'Brody'}
                          </Text>
                        </View>
                      </View>
                      {project.description ? (
                        <Text style={styles.projectDescText}>
                          {project.description}
                        </Text>
                      ) : null}
                    </View>

                    {renderValueBadgeOrEditor(project)}
                  </View>

                  {/* Hours & Hourly Rate Box */}
                  <View style={styles.timeRateBox}>
                    <View style={styles.timeRateTopRow}>
                      <View>
                        <View style={styles.hoursHeaderInline}>
                          <Text style={styles.smallMetaLabel}>
                            HORAS CONTABILIZADAS
                          </Text>
                          <Pressable
                            onPress={() => openAdjustHours(project)}
                            style={styles.adjustHoursTrigger}
                          >
                            <Text style={styles.adjustHoursTriggerText}>
                              + Horas / Ajustar
                            </Text>
                          </Pressable>
                        </View>
                        <Text style={styles.stopwatchLarge}>
                          ⏱ {formatStopwatch(totalSecs)}
                        </Text>
                        {(project.manualSeconds || 0) !== 0 && (
                          <Text style={styles.manualTagText}>
                            ({(project.manualSeconds || 0) > 0 ? '+' : '-'}
                            {formatDurationHuman(
                              Math.abs(project.manualSeconds || 0)
                            )}{' '}
                            manual)
                          </Text>
                        )}
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.smallMetaLabel}>
                          VALOR / HORA NO PROJETO
                        </Text>
                        <Text
                          style={[
                            styles.hourlyRateValue,
                            { color: secondaryColor },
                          ]}
                        >
                          {effectiveUsdPerHour > 0
                            ? `${formatUsd(effectiveUsdPerHour)}/h`
                            : '—'}
                        </Text>
                        {effectiveUsdPerHour > 0 && (
                          <Text style={styles.hourlyRateSub}>
                            {formatBrl(effectiveUsdPerHour * usdToBrlRate)}/h
                          </Text>
                        )}
                      </View>
                    </View>

                    {renderHoursAdjustPanel(project)}
                  </View>

                  {/* Linked Tasks */}
                  <View style={styles.linkedSection}>
                    <View style={styles.linkedHeaderRow}>
                      <Text style={styles.smallMetaLabel}>
                        TAREFAS VINCULADAS ({linkedCards.length})
                      </Text>
                      <Pressable
                        onPress={() =>
                          setLinkingProjectId(
                            linkingProjectId === project.id ? null : project.id
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.linkTaskBtnText,
                            { color: secondaryColor },
                          ]}
                        >
                          🔗 Vincular Tarefa
                        </Text>
                      </Pressable>
                    </View>

                    {linkingProjectId === project.id && (
                      <View style={styles.linkerDropdown}>
                        {boardCards.filter((c) => c.projectId !== project.id)
                          .length === 0 ? (
                          <Text style={styles.emptyBoxSub}>
                            Todas as tarefas já estão vinculadas.
                          </Text>
                        ) : (
                          boardCards
                            .filter((c) => c.projectId !== project.id)
                            .slice(0, 15)
                            .map((c) => (
                              <Pressable
                                key={c.id}
                                onPress={() => {
                                  onAssignCardProject(c.id, project.id);
                                  setLinkingProjectId(null);
                                }}
                                style={styles.linkerItem}
                              >
                                <Text
                                  style={styles.linkerItemTitle}
                                  numberOfLines={1}
                                >
                                  {c.title}
                                </Text>
                                <Text style={styles.linkerItemTime}>
                                  {formatDurationHuman(
                                    getLiveElapsedSeconds(c, nowMs)
                                  )}
                                </Text>
                              </Pressable>
                            ))
                        )}
                      </View>
                    )}

                    {linkedCards.map((c) => (
                      <View key={c.id} style={styles.linkedTaskRow}>
                        <Text style={styles.linkedTaskTitle} numberOfLines={1}>
                          • {c.title}
                        </Text>
                        <View style={styles.linkedTaskRight}>
                          <Text style={styles.linkedTaskTime}>
                            {formatStopwatch(getLiveElapsedSeconds(c, nowMs))}
                          </Text>
                          <Pressable
                            onPress={() => onAssignCardProject(c.id, undefined)}
                          >
                            <Text style={styles.unlinkText}>✕</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Footer Actions */}
                  <View style={styles.projectFooter}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => startEditing(project)}
                        style={styles.footerSecondaryBtn}
                      >
                        <Text style={styles.footerSecondaryText}>
                          ✏️ Editar
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setConfirmDeleteProject(project)}
                        style={styles.footerTrashBtn}
                      >
                        <Text style={styles.footerTrashText}>🗑️ Lixeira</Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => onCompleteProject(project.id)}
                      style={styles.completeProjectBtn}
                    >
                      <Text style={styles.completeProjectBtnText}>
                        ✓ Concluir Projeto
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          );
        })
      )}

      {/* COMPLETED PROJECTS OF THE MONTH SECTION */}
      <View style={styles.completedSectionHeader}>
        <Text style={[styles.sectionHeaderTitle, { color: '#34d399', marginTop: 0 }]}>
          ✓ CONCLUÍDOS EM {formattedMonthLabel.toUpperCase()} (
          {completedProjectsForMonth.length})
        </Text>
        <Text style={styles.completedTotalText}>
          {formatUsd(monthlyMetrics.completedUsd)} (
          {formatBrl(monthlyMetrics.completedBrl)})
        </Text>
      </View>

      {completedProjectsForMonth.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyBoxSub}>
            Nenhum projeto concluído em {formattedMonthLabel} ainda.
          </Text>
        </View>
      ) : (
        completedProjectsForMonth.map((project) => {
          const totalSecs = getProjectTotalSeconds(project, boardCards, nowMs);
          const hoursFloat = totalSecs / 3600;
          const effectiveRateUsd =
            hoursFloat > 0 ? (project.amountUsd || 0) / hoursFloat : 0;

          return (
            <View key={project.id} style={styles.completedProjectCard}>
              <View style={styles.projectTopRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={styles.projectTitleRow}>
                    <Text style={styles.projectTitleText}>
                      ✓ {project.title}
                    </Text>
                    <View style={styles.clientBadge}>
                      <Text style={styles.clientBadgeText}>
                        👤 {project.clientName || 'Brody'}
                      </Text>
                    </View>
                  </View>
                  {project.description ? (
                    <Text style={styles.projectDescText}>
                      {project.description}
                    </Text>
                  ) : null}
                </View>

                {renderValueBadgeOrEditor(project)}
              </View>

              <View style={styles.timeRateBox}>
                <View style={styles.timeRateTopRow}>
                  <View style={styles.hoursHeaderInline}>
                    <Text style={styles.stopwatchLarge}>
                      ⏱ {formatStopwatch(totalSecs)}
                    </Text>
                    <Pressable
                      onPress={() => openAdjustHours(project)}
                      style={styles.adjustHoursTrigger}
                    >
                      <Text style={styles.adjustHoursTriggerText}>
                        + Horas / Ajustar
                      </Text>
                    </Pressable>
                  </View>

                  <Text
                    style={[styles.hourlyRateValue, { color: secondaryColor }]}
                  >
                    {effectiveRateUsd > 0
                      ? `${formatUsd(effectiveRateUsd)}/h`
                      : '—'}
                  </Text>
                </View>

                {renderHoursAdjustPanel(project)}
              </View>

              <View style={styles.projectFooter}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => openEditValue(project)}
                    style={styles.footerSecondaryBtn}
                  >
                    <Text
                      style={[styles.footerSecondaryText, { color: '#34d399' }]}
                    >
                      💲 Mudar Valor
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onRestoreProject(project.id)}
                    style={styles.footerSecondaryBtn}
                  >
                    <Text style={styles.footerSecondaryText}>
                      ↩ Voltar p/ Ativos
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => setConfirmDeleteProject(project)}
                  style={styles.footerTrashBtn}
                >
                  <Text style={styles.footerTrashText}>🗑️ Lixeira</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      {/* DELIBERATE 2-STEP TRASH CONFIRMATION MODAL (Prevents accidental 1-tap deletion) */}
      <Modal
        visible={!!confirmDeleteProject}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteProject(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalBox}>
            <Text style={styles.confirmModalTitle}>
              🗑️ Mover Projeto para a Lixeira?
            </Text>
            <Text style={styles.confirmModalSub}>
              Confirma a exclusão do projeto &quot;
              {confirmDeleteProject?.title}&quot; (Cliente:{' '}
              {confirmDeleteProject?.clientName || 'Brody'})? Essa confirmação
              protege contra cliques acidentais.
            </Text>
            <View style={styles.confirmModalBtns}>
              <Pressable
                onPress={() => setConfirmDeleteProject(null)}
                style={styles.cancelEditBtn}
              >
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (confirmDeleteProject) {
                    onDeleteProject(confirmDeleteProject.id);
                    setConfirmDeleteProject(null);
                  }
                }}
                style={styles.confirmDeleteBtn}
              >
                <Text style={styles.confirmDeleteText}>
                  Sim, Excluir Projeto
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: '#110b22',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  ratePill: {
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rateLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  rateValueText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '900',
  },
  rateEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rateInput: {
    backgroundColor: '#110b22',
    color: '#34d399',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    width: 55,
    fontSize: 11,
    fontWeight: '800',
  },
  rateSaveBtn: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  rateSaveText: {
    color: '#07050d',
    fontSize: 10,
    fontWeight: '900',
  },
  headerControlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07050d',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
  },
  monthNavBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  monthNavText: {
    color: '#22d3ee',
    fontSize: 12,
    fontWeight: '900',
  },
  monthLabelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    minWidth: 100,
    textAlign: 'center',
  },
  headerBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientsBtn: {
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clientsBtnText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
  },
  newProjectBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newProjectBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  drawerCard: {
    backgroundColor: '#120b24',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  drawerTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '900',
    paddingHorizontal: 4,
  },
  clientsPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  clientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  clientChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  clientChipRemove: {
    color: '#fb7185',
    fontSize: 13,
    fontWeight: '900',
  },
  addClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addClientConfirmBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addClientConfirmText: {
    color: '#07050d',
    fontSize: 11,
    fontWeight: '900',
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 10,
  },
  clientSelectPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clientSelectText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  colorRowAndSubmit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  colorDotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  submitProjectBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  submitProjectText: {
    color: '#07050d',
    fontSize: 12,
    fontWeight: '900',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#110b22',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '900',
  },
  kpiMainValue: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  kpiSubValue: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 4,
  },
  emptyBox: {
    backgroundColor: '#110b22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyBoxTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyBoxSub: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  projectCard: {
    backgroundColor: '#110b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  completedProjectCard: {
    backgroundColor: 'rgba(6, 78, 59, 0.18)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  projectTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  projectTitleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  clientBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  clientBadgeText: {
    color: '#67e8f9',
    fontSize: 10,
    fontWeight: '800',
  },
  projectDescText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  valueBadgeBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.45)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  valueBadgeUsd: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '900',
  },
  valueBadgeBrl: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  valueEditorBox: {
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 10,
    padding: 6,
  },
  valueEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dollarPrefix: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '900',
  },
  valueEditorInput: {
    backgroundColor: '#110b22',
    color: '#6ee7b7',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.5)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    width: 65,
    fontSize: 12,
    fontWeight: '800',
  },
  saveValueBtn: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  saveValueBtnText: {
    color: '#07050d',
    fontSize: 11,
    fontWeight: '900',
  },
  cancelValueBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  cancelValueBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '900',
  },
  timeRateBox: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    gap: 8,
  },
  timeRateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hoursHeaderInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallMetaLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
  },
  adjustHoursTrigger: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.5)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  adjustHoursTriggerText: {
    color: '#67e8f9',
    fontSize: 9,
    fontWeight: '900',
  },
  stopwatchLarge: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  manualTagText: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 1,
  },
  hourlyRateValue: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  hourlyRateSub: {
    color: '#94a3b8',
    fontSize: 10,
  },
  adjustBox: {
    backgroundColor: '#07050d',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    padding: 10,
    gap: 8,
  },
  adjustHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustTitle: {
    fontSize: 10,
    fontWeight: '900',
  },
  hoursInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hourFieldWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hourInput: {
    flex: 1,
    backgroundColor: '#110b22',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  unitText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  adjustBtnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  adjustActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  subtractHoursBtn: {
    backgroundColor: 'rgba(225, 29, 72, 0.35)',
    borderColor: '#fb7185',
  },
  adjustActionText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  resetHoursBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  resetHoursText: {
    color: '#fda4af',
    fontSize: 10,
    fontWeight: '800',
  },
  linkedSection: {
    gap: 6,
  },
  linkedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkTaskBtnText: {
    fontSize: 10,
    fontWeight: '900',
  },
  linkerDropdown: {
    backgroundColor: '#07050d',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
    padding: 8,
    gap: 4,
  },
  linkerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  linkerItemTitle: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  linkerItemTime: {
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: '800',
  },
  linkedTaskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  linkedTaskTitle: {
    color: '#cbd5e1',
    fontSize: 11,
    flex: 1,
    paddingRight: 8,
  },
  linkedTaskRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkedTaskTime: {
    color: '#67e8f9',
    fontSize: 10,
    fontWeight: '800',
  },
  unlinkText: {
    color: '#fb7185',
    fontSize: 11,
    fontWeight: '900',
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
  },
  footerSecondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footerSecondaryText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
  },
  footerTrashBtn: {
    backgroundColor: 'rgba(225, 29, 72, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footerTrashText: {
    color: '#fda4af',
    fontSize: 11,
    fontWeight: '800',
  },
  completeProjectBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  completeProjectBtnText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '900',
  },
  completedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  completedTotalText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '900',
  },
  editFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelEditBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelEditText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
  },
  saveEditBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveEditText: {
    color: '#07050d',
    fontSize: 11,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalBox: {
    backgroundColor: '#120b24',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f43f5e',
    padding: 18,
    width: '100%',
    maxWidth: 360,
    gap: 10,
  },
  confirmModalTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  confirmModalSub: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  confirmModalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  confirmDeleteBtn: {
    backgroundColor: '#e11d48',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  confirmDeleteText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
});
