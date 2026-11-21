import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Board, TaskCard, ThemeColors, WorkProject } from '../core/types';
import {
  formatDurationHuman,
  formatShortDatePt,
  formatStopwatch,
  getBrasiliaYearMonth,
} from '../core/timeUtils';
import {
  formatBrl,
  formatUsd,
  getProjectMonthKey,
  getProjectPaymentBreakdown,
  getProjectTotalSeconds,
} from './ProjectsTabMobile';

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

interface DaleTabMobileProps {
  boards: Board[];
  activeBoardId: string;
  completedCards: TaskCard[];
  allCards: TaskCard[];
  projects: WorkProject[];
  nowMs: number;
  usdToBrlRate: number;
  themeColors: ThemeColors;
  onSelectCard: (cardId: string) => void;
  onRestoreCard: (cardId: string) => void;
  onUpdateProject: (updated: WorkProject) => void;
  onRestoreProject: (projectId: string) => void;
}

export const DaleTabMobile: React.FC<DaleTabMobileProps> = ({
  boards,
  activeBoardId,
  completedCards,
  allCards,
  projects,
  nowMs,
  usdToBrlRate,
  themeColors,
  onSelectCard,
  onRestoreCard,
  onUpdateProject,
  onRestoreProject,
}) => {
  const primaryColor = themeColors.primaryColor || '#a855f7';
  const secondaryColor = themeColors.secondaryColor || '#06b6d4';

  const currentMonthKey = getBrasiliaYearMonth();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [boardFilter, setBoardFilter] = useState<string>(activeBoardId);
  const [showGraphs, setShowGraphs] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number>(
    () => parseInt(currentMonthKey.slice(0, 4), 10) || new Date().getFullYear()
  );
  const [inspectedMonthIndex, setInspectedMonthIndex] = useState<number>(
    () => (parseInt(currentMonthKey.slice(5, 7), 10) || 1) - 1
  );

  // Quick inline value ($ USD) edit state in Dale
  const [editingValueProjectId, setEditingValueProjectId] = useState<
    string | null
  >(null);
  const [valueInputUsd, setValueInputUsd] = useState('');

  useEffect(() => {
    setBoardFilter(activeBoardId);
  }, [activeBoardId]);

  useEffect(() => {
    const yr = parseInt(selectedMonth.slice(0, 4), 10);
    const mo = parseInt(selectedMonth.slice(5, 7), 10);
    if (!isNaN(yr)) setSelectedYear(yr);
    if (!isNaN(mo) && mo >= 1 && mo <= 12) setInspectedMonthIndex(mo - 1);
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const dt = new Date(y, m - 2, 1);
    setSelectedMonth(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const dt = new Date(y, m, 1);
    setSelectedMonth(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    const idx = parseInt(m, 10) - 1;
    return `${MONTH_NAMES[idx] || m} ${y}`;
  };

  const monthCards = useMemo(() => {
    return completedCards
      .filter((c) => {
        const ym = (c.completedAt || c.createdAt).slice(0, 7);
        const matchesMonth = ym === selectedMonth;
        const matchesBoard =
          boardFilter === 'all' ? true : c.boardId === boardFilter;
        return matchesMonth && matchesBoard;
      })
      .sort((a, b) =>
        (b.completedAt || b.createdAt).localeCompare(
          a.completedAt || a.createdAt
        )
      );
  }, [completedCards, selectedMonth, boardFilter]);

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
    return sourceList.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return (b.completedAt || b.createdAt).localeCompare(
        a.completedAt || a.createdAt
      );
    });
  }, [projects, selectedMonth, boardFilter]);

  const monthProjectStats = useMemo(() => {
    const earnedUsd = monthCompletedProjects.reduce(
      (acc, p) => acc + getProjectPaymentBreakdown(p, usdToBrlRate).netUsd,
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

  // 12-Month Yearly Bar Chart Data for "Graphs"
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
        (acc, p) => acc + getProjectPaymentBreakdown(p, usdToBrlRate).netUsd,
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
        existing.totalUsd += getProjectPaymentBreakdown(p, usdToBrlRate).netUsd;
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

  const openEditValue = (proj: WorkProject) => {
    if (editingValueProjectId === proj.id) {
      setEditingValueProjectId(null);
      return;
    }
    setEditingValueProjectId(proj.id);
    setValueInputUsd(String(proj.amountUsd ?? 0));
  };

  const saveQuickValue = (proj: WorkProject) => {
    const parsedUsd = parseFloat(valueInputUsd.replace(',', '.'));
    if (isNaN(parsedUsd) || parsedUsd < 0) return;
    onUpdateProject({
      ...proj,
      amountUsd: Math.max(0, parsedUsd),
    });
    setEditingValueProjectId(null);
  };

  const inspectedMonth =
    yearlyMonthsData.months[inspectedMonthIndex] || yearlyMonthsData.months[0];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
    >
      {/* Top Banner */}
      <View
        style={[
          styles.topBanner,
          { borderColor: `${primaryColor}45` },
        ]}
      >
        <View style={styles.bannerTopRow}>
          <Text style={styles.bannerTitle}>🏆 Dale</Text>

          {/* GRAPHS BUTTON (To the left of the chosen month!) + MONTH SELECTOR */}
          <View style={styles.controlsRow}>
            <Pressable
              onPress={() => setShowGraphs((v) => !v)}
              style={[
                styles.graphsBtn,
                showGraphs && {
                  backgroundColor: primaryColor,
                  borderColor: secondaryColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.graphsBtnText,
                  showGraphs && { color: '#ffffff' },
                ]}
              >
                📊 Graphs
              </Text>
            </Pressable>

            <View style={styles.monthSelector}>
              <Pressable onPress={handlePrevMonth} style={styles.monthNavBtn}>
                <Text style={styles.monthNavText}>◀</Text>
              </Pressable>
              <Text style={styles.monthLabelText}>
                {formatMonthLabel(selectedMonth)}
              </Text>
              <Pressable onPress={handleNextMonth} style={styles.monthNavBtn}>
                <Text style={styles.monthNavText}>▶</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Board Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterPillsRow}>
            {boards.map((b) => {
              const active = boardFilter === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setBoardFilter(b.id)}
                  style={[
                    styles.filterPill,
                    active && {
                      backgroundColor: primaryColor,
                      borderColor: secondaryColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && { color: '#ffffff' },
                    ]}
                  >
                    {b.name}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setBoardFilter('all')}
              style={[
                styles.filterPill,
                boardFilter === 'all' && {
                  backgroundColor: primaryColor,
                  borderColor: secondaryColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  boardFilter === 'all' && { color: '#ffffff' },
                ]}
              >
                Todos
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* GRAPHS VIEW: Annual Bar Chart by Month with Touch/Tap Monthly Detail Card */}
      {showGraphs && (
        <View
          style={[
            styles.graphsContainer,
            { borderColor: `${secondaryColor}60` },
          ]}
        >
          <View style={styles.graphsHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.graphsHeaderTitle}>
                📊 Graphs — Ganhos por Mês ({selectedYear})
              </Text>
              <Text style={styles.graphsHeaderSub}>
                Toque em qualquer mês no gráfico para ver projetos feitos, hora
                média e clientes daquele mês!
              </Text>
            </View>

            <View style={styles.yearSelector}>
              <Pressable
                onPress={() => setSelectedYear((y) => y - 1)}
                style={styles.monthNavBtn}
              >
                <Text style={styles.monthNavText}>◀</Text>
              </Pressable>
              <Text style={[styles.yearText, { color: secondaryColor }]}>
                {selectedYear}
              </Text>
              <Pressable
                onPress={() => setSelectedYear((y) => y + 1)}
                style={styles.monthNavBtn}
              >
                <Text style={styles.monthNavText}>▶</Text>
              </Pressable>
            </View>
          </View>

          {/* Annual Summary KPIs */}
          <View style={styles.kpiGrid}>
            <View
              style={[
                styles.kpiCard,
                { borderColor: 'rgba(16,185,129,0.4)' },
              ]}
            >
              <Text style={[styles.kpiLabel, { color: '#6ee7b7' }]}>
                GANHO EM {selectedYear}
              </Text>
              <Text style={[styles.kpiMainValue, { color: '#34d399' }]}>
                {formatUsd(yearlyMonthsData.yearTotalUsd)}
              </Text>
              <Text style={styles.kpiSubValue}>
                {formatBrl(yearlyMonthsData.yearTotalBrl)}
              </Text>
            </View>

            <View
              style={[
                styles.kpiCard,
                { borderColor: `${secondaryColor}55` },
              ]}
            >
              <Text style={[styles.kpiLabel, { color: secondaryColor }]}>
                HORA MÉDIA NO ANO
              </Text>
              <Text style={[styles.kpiMainValue, { color: secondaryColor }]}>
                {formatUsd(yearlyMonthsData.yearAvgHourlyUsd)}/h
              </Text>
              <Text style={styles.kpiSubValue}>
                {formatBrl(yearlyMonthsData.yearAvgHourlyBrl)}/h
              </Text>
            </View>

            <View
              style={[
                styles.kpiCard,
                { borderColor: `${primaryColor}55` },
              ]}
            >
              <Text style={[styles.kpiLabel, { color: '#d8b4fe' }]}>
                PROJETOS NO ANO
              </Text>
              <Text style={[styles.kpiMainValue, { color: '#e9d5ff' }]}>
                {yearlyMonthsData.yearTotalProjects}
              </Text>
              <Text style={styles.kpiSubValue}>
                ⏱ {formatDurationHuman(yearlyMonthsData.yearTotalSeconds)}
              </Text>
            </View>

            <View
              style={[
                styles.kpiCard,
                { borderColor: 'rgba(217,70,239,0.45)' },
              ]}
            >
              <Text style={[styles.kpiLabel, { color: '#f0abfc' }]}>
                CLIENTES ({yearlyMonthsData.yearClients.length})
              </Text>
              <Text
                style={[styles.kpiMainValue, { color: '#ffffff', fontSize: 13 }]}
                numberOfLines={2}
              >
                {yearlyMonthsData.yearClients.length > 0
                  ? yearlyMonthsData.yearClients.join(', ')
                  : '—'}
              </Text>
            </View>
          </View>

          {/* 12-Month Vertical Bar Chart (Horizontally scrollable for crisp touch targets on mobile) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartRow}>
              {yearlyMonthsData.months.map((m) => {
                const heightPct =
                  m.earnedUsd > 0
                    ? Math.max(
                        15,
                        Math.round(
                          (m.earnedUsd / yearlyMonthsData.maxMonthUsd) * 100
                        )
                      )
                    : 6;
                const isInspected = m.monthIndex === inspectedMonthIndex;

                return (
                  <Pressable
                    key={m.ym}
                    onPress={() => {
                      setInspectedMonthIndex(m.monthIndex);
                      setSelectedMonth(m.ym);
                    }}
                    style={[
                      styles.barCol,
                      isInspected && {
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        borderRadius: 12,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.barTopUsd,
                        m.earnedUsd > 0
                          ? { color: '#34d399' }
                          : { color: '#475569' },
                      ]}
                    >
                      {m.earnedUsd > 0 ? `$${Math.round(m.earnedUsd)}` : '$0'}
                    </Text>

                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${heightPct}%`,
                            backgroundColor:
                              m.earnedUsd > 0
                                ? isInspected
                                  ? secondaryColor
                                  : primaryColor
                                : isInspected
                                  ? 'rgba(168,85,247,0.45)'
                                  : 'rgba(255,255,255,0.1)',
                          },
                        ]}
                      />
                    </View>

                    <Text
                      style={[
                        styles.barMonthName,
                        isInspected && {
                          color: '#ffffff',
                          fontWeight: '900',
                        },
                      ]}
                    >
                      {m.shortName}
                    </Text>
                    {m.projects.length > 0 && (
                      <Text
                        style={[
                          styles.barProjCount,
                          { color: secondaryColor },
                        ]}
                      >
                        {m.projects.length}p
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* INSPECTED MONTH DETAIL CARD (Mobile Equivalent of Hover Tooltip) */}
          {inspectedMonth && (
            <View
              style={[
                styles.inspectedCard,
                { borderColor: secondaryColor },
              ]}
            >
              <View style={styles.inspectedTopRow}>
                <View>
                  <Text
                    style={[
                      styles.inspectedMonthTitle,
                      { color: secondaryColor },
                    ]}
                  >
                    {inspectedMonth.monthName.toUpperCase()} DE {selectedYear}
                  </Text>
                  <Text style={styles.inspectedSub}>
                    {inspectedMonth.projects.length} projeto(s) •{' '}
                    {inspectedMonth.tasksCount} tarefa(s)
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.inspectedEarnedUsd}>
                    {formatUsd(inspectedMonth.earnedUsd)}
                  </Text>
                  <Text style={styles.inspectedEarnedBrl}>
                    {formatBrl(inspectedMonth.earnedBrl)}
                  </Text>
                </View>
              </View>

              {/* Average Hourly Rate & Total Hours of the Inspected Month */}
              <View style={styles.inspectedRateBox}>
                <View>
                  <Text style={styles.smallMetaLabel}>
                    HORA MÉDIA DE GANHOS NO MÊS
                  </Text>
                  <Text
                    style={[
                      styles.inspectedRateVal,
                      { color: secondaryColor },
                    ]}
                  >
                    {inspectedMonth.avgHourlyUsd > 0
                      ? `${formatUsd(inspectedMonth.avgHourlyUsd)}/h (${formatBrl(inspectedMonth.avgHourlyBrl)}/h)`
                      : '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.smallMetaLabel}>HORAS TRABALHADAS</Text>
                  <Text style={styles.inspectedHoursVal}>
                    ⏱ {formatStopwatch(inspectedMonth.totalSeconds)}
                  </Text>
                </View>
              </View>

              {/* Clients of the Month */}
              <View style={{ gap: 6 }}>
                <Text style={styles.smallMetaLabel}>
                  👥 CLIENTES DAQUELE MÊS (
                  {inspectedMonth.clientsBreakdown.length})
                </Text>
                {inspectedMonth.clientsBreakdown.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Nenhum cliente registrado neste mês.
                  </Text>
                ) : (
                  <View style={styles.clientsRowWrap}>
                    {inspectedMonth.clientsBreakdown.map((cl) => (
                      <View key={cl.clientName} style={styles.clientMonthPill}>
                        <Text style={styles.clientMonthName}>
                          👤 {cl.clientName}
                        </Text>
                        <Text style={styles.clientMonthStats}>
                          ({cl.count}x • {formatUsd(cl.totalUsd)})
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Projects Done in the Month */}
              <View style={{ gap: 6 }}>
                <Text style={styles.smallMetaLabel}>
                  💼 PROJETOS FEITOS NO MÊS ({inspectedMonth.projects.length})
                </Text>
                {inspectedMonth.projects.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Nenhum projeto neste mês.
                  </Text>
                ) : (
                  inspectedMonth.projects.map((p) => {
                    const pSecs = getProjectTotalSeconds(p, allCards, nowMs);
                    const pPay = getProjectPaymentBreakdown(p, usdToBrlRate);
                    return (
                      <View key={p.id} style={styles.inspectedProjRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.inspectedProjTitle}>
                            {p.title}
                          </Text>
                          <Text style={styles.inspectedProjMeta}>
                            👤 {p.clientName || 'Brody'} • ⏱{' '}
                            {formatDurationHuman(pSecs)}
                            {pPay.method
                              ? ` • ${
                                  pPay.method === 'paypal'
                                    ? '🔵 PayPal (-6.4%)'
                                    : '🟢 Wise (-0.33%)'
                                }`
                              : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.inspectedProjUsd}>
                            {formatUsd(pPay.netUsd)}
                          </Text>
                          <Text style={styles.inspectedProjBrl}>
                            {formatBrl(pPay.netBrl)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* MONTHLY KPI CARDS */}
      <View style={styles.kpiGrid}>
        <View
          style={[
            styles.kpiCard,
            { borderColor: 'rgba(16,185,129,0.4)' },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: '#6ee7b7' }]}>
            GANHOS NO MÊS
          </Text>
          <Text style={[styles.kpiMainValue, { color: '#34d399' }]}>
            {formatUsd(monthProjectStats.earnedUsd)}
          </Text>
          <Text style={styles.kpiSubValue}>
            {formatBrl(monthProjectStats.earnedBrl)}
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            { borderColor: `${secondaryColor}55` },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: secondaryColor }]}>
            VALOR DA HORA MÉDIA
          </Text>
          <Text style={[styles.kpiMainValue, { color: secondaryColor }]}>
            {formatUsd(monthProjectStats.avgHourlyUsd)}/h
          </Text>
          <Text style={styles.kpiSubValue}>
            {formatBrl(monthProjectStats.avgHourlyBrl)}/h
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            { borderColor: `${primaryColor}55` },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: '#d8b4fe' }]}>
            PROJETOS NO MÊS
          </Text>
          <Text style={[styles.kpiMainValue, { color: '#e9d5ff' }]}>
            {monthCompletedProjects.length}
          </Text>
          <Text style={styles.kpiSubValue}>
            ⏱ {formatDurationHuman(monthProjectStats.projectSeconds)}
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            { borderColor: 'rgba(217,70,239,0.45)' },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: '#f0abfc' }]}>
            TAREFAS CONCLUÍDAS ({monthCards.length})
          </Text>
          <Text style={[styles.kpiMainValue, { color: '#ffffff' }]}>
            {formatDurationHuman(totalMonthSeconds)}
          </Text>
          <Text style={styles.kpiSubValue}>Cronômetro total</Text>
        </View>
      </View>

      {/* COMPLETED PROJECTS OF THE MONTH */}
      {monthCompletedProjects.length > 0 && (
        <View style={styles.projectsBox}>
          <Text style={styles.sectionTitle}>
            💼 Projetos Concluídos no Mês ({monthCompletedProjects.length})
          </Text>
          {monthCompletedProjects.map((proj) => {
            const pSecs = getProjectTotalSeconds(proj, allCards, nowMs);
            const pPay = getProjectPaymentBreakdown(proj, usdToBrlRate);
            const pHours = pSecs / 3600;
            const pRateUsd = pHours > 0 ? pPay.netUsd / pHours : 0;

            return (
              <View key={proj.id} style={styles.projectRowCard}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={styles.projRowHeader}>
                    <Text style={styles.projRowTitle}>✓ {proj.title}</Text>
                    <View style={styles.clientBadge}>
                      <Text style={styles.clientBadgeText}>
                        👤 {proj.clientName || 'Brody'}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Pressable
                      onPress={() =>
                        onUpdateProject({ ...proj, paymentMethod: 'wise' })
                      }
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 2.5,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor:
                          proj.paymentMethod === 'wise'
                            ? '#10b981'
                            : 'rgba(255,255,255,0.12)',
                        backgroundColor:
                          proj.paymentMethod === 'wise'
                            ? 'rgba(16,185,129,0.22)'
                            : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9.5,
                          fontWeight: '800',
                          color:
                            proj.paymentMethod === 'wise'
                              ? '#6ee7b7'
                              : '#94a3b8',
                        }}
                      >
                        🟢 Wise (-0.33%)
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        onUpdateProject({ ...proj, paymentMethod: 'paypal' })
                      }
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 2.5,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor:
                          proj.paymentMethod === 'paypal'
                            ? '#3b82f6'
                            : 'rgba(255,255,255,0.12)',
                        backgroundColor:
                          proj.paymentMethod === 'paypal'
                            ? 'rgba(59,130,246,0.22)'
                            : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9.5,
                          fontWeight: '800',
                          color:
                            proj.paymentMethod === 'paypal'
                              ? '#93c5fd'
                              : '#94a3b8',
                        }}
                      >
                        🔵 PayPal (-6.4%)
                      </Text>
                    </Pressable>
                  </View>
                  {proj.description ? (
                    <Text style={styles.projRowDesc}>{proj.description}</Text>
                  ) : null}
                  <Text style={[styles.projRowMeta, { color: secondaryColor }]}>
                    ⏱ {formatStopwatch(pSecs)}
                    {pRateUsd > 0 ? ` • ${formatUsd(pRateUsd)}/h` : ''}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  {editingValueProjectId === proj.id ? (
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
                        onPress={() => saveQuickValue(proj)}
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
                  ) : (
                    <>
                      <Pressable
                        onPress={() => openEditValue(proj)}
                        style={styles.valueBadgeBtn}
                      >
                        <Text style={styles.valueBadgeUsd}>
                          {formatUsd(pPay.netUsd)} ✏️
                        </Text>
                      </Pressable>
                      <Text style={styles.valueBadgeBrl}>
                        {formatBrl(pPay.netBrl)}
                      </Text>
                      {pPay.method && pPay.grossUsd > 0 && (
                        <Text style={{ color: '#94a3b8', fontSize: 9, marginTop: 1 }}>
                          Bruto: {formatUsd(pPay.grossUsd)} (-{pPay.feePercent}%)
                        </Text>
                      )}
                    </>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <Pressable onPress={() => openEditValue(proj)}>
                      <Text style={styles.actionLinkGreen}>Mudar Valor</Text>
                    </Pressable>
                    <Pressable onPress={() => onRestoreProject(proj.id)}>
                      <Text style={styles.actionLinkCyan}>Reativar</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* COMPLETED TASKS LIST */}
      <Text style={styles.sectionTitle}>
        ✓ Tarefas Finalizadas em {formatMonthLabel(selectedMonth)} (
        {monthCards.length})
      </Text>

      {monthCards.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Nenhuma tarefa finalizada neste mês ainda.
          </Text>
        </View>
      ) : (
        monthCards.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => onSelectCard(c.id)}
            style={styles.taskRow}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.taskRowTitle}>{c.title}</Text>
              <Text style={styles.taskRowMeta}>
                ⏱ {formatDurationHuman(c.elapsedSeconds || 0)} •{' '}
                {formatShortDatePt(c.scheduledDate)}
              </Text>
            </View>
            <Pressable
              onPress={() => onRestoreCard(c.id)}
              style={styles.reopenBtn}
            >
              <Text style={styles.reopenBtnText}>↩ Restaurar</Text>
            </Pressable>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  topBanner: {
    backgroundColor: '#110b22',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  bannerTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  graphsBtn: {
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  graphsBtnText: {
    color: '#67e8f9',
    fontSize: 12,
    fontWeight: '900',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07050d',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 6,
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
    minWidth: 96,
    textAlign: 'center',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  graphsContainer: {
    backgroundColor: '#110b22',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  graphsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  graphsHeaderTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  graphsHeaderSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07050d',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 6,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '900',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#0c0818',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '900',
  },
  kpiMainValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  kpiSubValue: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#07050d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
  },
  barCol: {
    width: 42,
    alignItems: 'center',
    paddingVertical: 6,
  },
  barTopUsd: {
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 4,
  },
  barTrack: {
    width: 24,
    height: 115,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    padding: 2,
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barMonthName: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  barProjCount: {
    fontSize: 9,
    fontWeight: '900',
  },
  inspectedCard: {
    backgroundColor: '#090612',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  inspectedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 8,
  },
  inspectedMonthTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  inspectedSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  inspectedEarnedUsd: {
    color: '#34d399',
    fontSize: 15,
    fontWeight: '900',
  },
  inspectedEarnedBrl: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '700',
  },
  inspectedRateBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 10,
  },
  smallMetaLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '900',
  },
  inspectedRateVal: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  inspectedHoursVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  clientsRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  clientMonthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  clientMonthName: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  clientMonthStats: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '800',
  },
  inspectedProjRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 10,
  },
  inspectedProjTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  inspectedProjMeta: {
    color: '#67e8f9',
    fontSize: 10,
    marginTop: 2,
  },
  inspectedProjUsd: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '900',
  },
  inspectedProjBrl: {
    color: '#6ee7b7',
    fontSize: 10,
  },
  projectsBox: {
    backgroundColor: '#110b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },
  projectRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#160f2b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    padding: 12,
  },
  projRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  projRowTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
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
  projRowDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  projRowMeta: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  valueBadgeBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.45)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    backgroundColor: '#07050d',
    color: '#6ee7b7',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    width: 60,
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
  actionLinkGreen: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  actionLinkCyan: {
    color: '#67e8f9',
    fontSize: 10,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  emptyBox: {
    backgroundColor: '#110b22',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 11,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#110b22',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  taskRowTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'line-through',
  },
  taskRowMeta: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  reopenBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reopenBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
  },
});
