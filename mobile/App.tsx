import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
import {
  ActiveTab,
  Board,
  BoardList,
  CustomLabel,
  NeonStoreState,
  RecurrenceConfig,
  TagColorItem,
  TaskCard,
  ThemeColors,
  UserBoardPayload,
  UserProfile,
  WorkProject,
  ProjectPaymentMethod,
} from './src/core/types';
import {
  DEFAULT_CUSTOM_LABELS,
  DEFAULT_TAG_COLORS,
  resolveLabelInfo,
  sanitizeCardLabels,
  toggleLabelSelection,
} from './src/core/labelsAndColors';
import {
  addMinutesToTime24h,
  buildRecurringTaskCards,
  clampEndTime,
  compareCardsByTimeOfDay,
  formatDurationHuman,
  formatShortDatePt,
  formatStopwatch,
  getBrasiliaNow,
  getCurrentTime24h,
  getDayPeriodKey,
  getLiveElapsedSeconds,
  getTodayIsoDate,
  getTomorrowIsoDate,
  getYesterdayIsoDate,
  isTodayListTitle,
  isTomorrowListTitle,
  isYesterdayListTitle,
  pauseAllRunningTimers,
  reconcileStateWithBrasiliaTime,
  shiftTaskAndGroupToDate,
  syncEndTimeWithStart,
  toggleCardTimerState,
} from './src/core/timeUtils';
import {
  createNewUserBoardState,
  DEFAULT_CLIENTS,
  DEFAULT_THEME_COLORS,
  generateFriendCode,
  getUserInitials,
  mergeCardsByTimestamp,
  normalizeClientsList,
  normalizeProjectsWithDefaultClient,
} from './src/core/syncMerge';
import {
  fetchFriendshipsMobile,
  fetchUserAndFriendsBoardsMobile,
  fetchUserProfileMobile,
  getCurrentUserMobile,
  getSupabaseMobileClient,
  loadLocalBoardState,
  saveLocalBoardState,
  saveUserBoardToCloudMobile,
  signOutUserMobile,
  subscribeToUserBoardsRealtime,
  upsertProfileSafely,
} from './src/adapters/supabaseMobile';
import { AuthModalMobile } from './src/components/AuthModalMobile';
import { FriendsModalMobile } from './src/components/FriendsModalMobile';
import { CardDetailSheet } from './src/components/CardDetailSheet';
import {
  ProjectsTabMobile,
  getProjectMonthKey,
} from './src/components/ProjectsTabMobile';
import { DaleTabMobile } from './src/components/DaleTabMobile';
import { ThemeSettingsModalMobile } from './src/components/ThemeSettingsModalMobile';
import { TimeInput24hMobile } from './src/components/TimeInput24hMobile';

const DEFAULT_RECURRENCE: RecurrenceConfig = {
  enabled: false,
  mode: 'weekdays',
  weekdays: [1, 2, 3, 4, 5],
  daysCount: 4,
};

export default function App() {
  const [state, setState] = useState<NeonStoreState>(() => {
    const starter = createNewUserBoardState('Neon');
    return reconcileStateWithBrasiliaTime({
      boards: starter.boards || [starter.board],
      activeBoardId: starter.board.id,
      lists: starter.lists,
      cards: starter.cards,
      customLabels: DEFAULT_CUSTOM_LABELS,
      tagColors: DEFAULT_TAG_COLORS,
      lastUpdated: new Date().toISOString(),
    });
  });

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const currentBrasiliaIso = useMemo(() => getTodayIsoDate(), [nowMs]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('board');
  const [activeListId, setActiveListId] = useState<string>('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [linkingCardIdForProject, setLinkingCardIdForProject] = useState<
    string | null
  >(null);
  const [adjustingTimeCardId, setAdjustingTimeCardId] = useState<string | null>(
    null
  );
  const [quickAdjustHours, setQuickAdjustHours] = useState('');
  const [quickAdjustMinutes, setQuickAdjustMinutes] = useState('');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);

  // Auth & Friends
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [acceptedFriendIds, setAcceptedFriendIds] = useState<string[]>([]);
  const [pendingFriendCount, setPendingFriendCount] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);

  // Inline Quick Add Task State
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:00');
  const [newDate, setNewDate] = useState(() => getTodayIsoDate());
  const [newTag, setNewTag] = useState('');
  const [newTagColor, setNewTagColor] = useState('#a855f7');
  const [newLabels, setNewLabels] = useState<string[]>(['lbl-blue']);
  const [newRecurrence, setNewRecurrence] = useState<RecurrenceConfig>(DEFAULT_RECURRENCE);

  // Calendar View State
  const [calMonthOffset, setCalMonthOffset] = useState(0);
  const [selectedCalDateIso, setSelectedCalDateIso] = useState(() => getTodayIsoDate());

  // 1-second ticker for deterministic live stopwatches & 00:00 Brasília rollover
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reconcile state at 00:00 Brasília time automatically
  useEffect(() => {
    setState((prev) => reconcileStateWithBrasiliaTime(prev));
  }, [currentBrasiliaIso]);

  const activeBoard: Board = useMemo(() => {
    return (
      state.boards.find((b) => b.id === state.activeBoardId) ||
      state.boards[0] || {
        id: 'default',
        name: 'Board',
        owner: 'User',
        subtitle: '',
        accentFrom: '#06b6d4',
        accentTo: '#a855f7',
      }
    );
  }, [state.boards, state.activeBoardId]);

  const boardLists: BoardList[] = useMemo(() => {
    return state.lists
      .filter((l) => l.boardId === activeBoard.id)
      .sort((a, b) => a.order - b.order);
  }, [state.lists, activeBoard.id]);

  // Keep activeListId valid (default to Today column)
  useEffect(() => {
    if (boardLists.length === 0) return;
    const exists = boardLists.some((l) => l.id === activeListId);
    if (!exists) {
      const todayCol =
        boardLists.find((l) => isTodayListTitle(l.title)) || boardLists[0];
      setActiveListId(todayCol.id);
    }
  }, [boardLists, activeListId]);

  const loadFriendsAndSyncBoards = async (profile: UserProfile) => {
    try {
      // 1. Load cached local snapshot first for instant responsiveness
      const cachedRaw = await loadLocalBoardState(profile.id);
      let cachedCards: TaskCard[] = [];
      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw) as NeonStoreState;
          if (parsed && parsed.boards && parsed.boards.length > 0) {
            cachedCards = parsed.cards || [];
            setState(reconcileStateWithBrasiliaTime(parsed));
          }
        } catch {
          // ignore invalid cache
        }
      }

      // 2. Fetch friendships & cloud boards from Supabase
      const fList = await fetchFriendshipsMobile(profile.id);
      const pending = fList.filter(
        (f) => f.status === 'pending' && f.friendId === profile.id
      );
      setPendingFriendCount(pending.length);

      const friendIds = fList
        .filter((f) => f.status === 'accepted')
        .map((f) => (f.userId === profile.id ? f.friendId : f.userId));
      setAcceptedFriendIds(friendIds);

      const { ownerBoard, friendsBoards } = await fetchUserAndFriendsBoardsMobile(
        profile.id,
        friendIds
      );

      if (ownerBoard) {
        setState((prev) => {
          const rawMyBoards =
            ownerBoard.boards && ownerBoard.boards.length > 0
              ? ownerBoard.boards
              : [ownerBoard.board];
          let myBoards = rawMyBoards.filter((b) => {
            const ownerLower = (b.owner || '').toLowerCase();
            const userLower = profile.username.toLowerCase();
            return (
              ownerLower === userLower ||
              (userLower.includes('elbioh') && ownerLower.includes('elbioh')) ||
              (userLower.includes('didi') && ownerLower.includes('didi'))
            );
          });
          if (myBoards.length === 0) {
            myBoards = [
              {
                ...ownerBoard.board,
                name: `${profile.username}'s Board`,
                owner: profile.username,
              },
            ];
          }

          const myBoardIds = new Set(myBoards.map((b) => b.id));
          const myLists = ownerBoard.lists.filter(
            (l) => myBoardIds.has(l.boardId) || !l.boardId
          );
          const remoteMyCards = ownerBoard.cards.filter(
            (c) => myBoardIds.has(c.boardId) || !c.boardId
          );

          // Per-card timestamp conflict resolution between local cache and cloud
          const mergedMyCards = mergeCardsByTimestamp(
            cachedCards.filter((c) => myBoardIds.has(c.boardId)),
            remoteMyCards,
            true
          );

          const rawMyProjects = (
            ownerBoard.projects ||
            prev.projects ||
            []
          ).filter((p) => myBoardIds.has(p.boardId) || !p.boardId);
          const { projects: myProjects, didBackfill } =
            normalizeProjectsWithDefaultClient(rawMyProjects);
          const myClients = normalizeClientsList(
            ownerBoard.clients || prev.clients,
            myProjects
          );

          const allBoards = [
            ...myBoards,
            ...friendsBoards.map((fb) => fb.board),
          ];
          const allLists = [
            ...myLists,
            ...friendsBoards.flatMap((fb) => fb.lists),
          ];
          const allCards = [
            ...mergedMyCards,
            ...friendsBoards.flatMap((fb) => fb.cards),
          ];
          const allProjects = [
            ...myProjects,
            ...friendsBoards.flatMap(
              (fb) => normalizeProjectsWithDefaultClient(fb.projects).projects
            ),
          ];

          const validActiveBoardId = allBoards.some(
            (b) => b.id === prev.activeBoardId
          )
            ? prev.activeBoardId
            : myBoards[0].id;

          const nextState = reconcileStateWithBrasiliaTime({
            ...prev,
            boards: allBoards,
            lists: allLists,
            cards: allCards,
            projects: allProjects,
            clients: myClients,
            themeColors:
              ownerBoard.themeColors ||
              prev.themeColors ||
              DEFAULT_THEME_COLORS,
            customLabels:
              ownerBoard.customLabels !== undefined
                ? ownerBoard.customLabels
                : prev.customLabels,
            tagColors:
              ownerBoard.tagColors !== undefined
                ? ownerBoard.tagColors
                : prev.tagColors,
            activeBoardId: validActiveBoardId,
            lastUpdated: new Date().toISOString(),
          });

          saveLocalBoardState(profile.id, JSON.stringify(nextState));

          if (didBackfill || !ownerBoard.clients) {
            saveUserBoardToCloudMobile(profile.id, {
              board: myBoards[0],
              boards: myBoards,
              lists: myLists,
              cards: mergedMyCards,
              projects: myProjects,
              clients: myClients,
              themeColors: nextState.themeColors,
              customLabels: nextState.customLabels,
              tagColors: nextState.tagColors,
            });
          }

          return nextState;
        });
      } else {
        const fresh = createNewUserBoardState(profile.username);
        await saveUserBoardToCloudMobile(profile.id, fresh);
        setState((prev) => ({
          ...prev,
          boards: [fresh.board],
          lists: fresh.lists,
          cards: fresh.cards,
          customLabels: fresh.customLabels,
          tagColors: fresh.tagColors,
          activeBoardId: fresh.board.id,
        }));
      }
    } catch (e) {
      console.error('Error syncing boards on mobile:', e);
    }
  };

  // Automatic Over-The-Air (OTA) Update Check on Launch & Foreground
  useEffect(() => {
    const checkAndApplyOtaUpdate = async () => {
      try {
        if (__DEV__ || !Updates.isEnabled) return;
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Ignore OTA check errors in dev/offline mode
      }
    };

    checkAndApplyOtaUpdate();
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkAndApplyOtaUpdate();
      }
    });
    return () => sub.remove();
  }, []);

  // Initial Auth Check
  useEffect(() => {
    getCurrentUserMobile()
      .then(async (user) => {
        if (user) {
          let profile = await fetchUserProfileMobile(user.id);
          if (!profile) {
            const rawUsername =
              user.user_metadata?.username ||
              user.email?.split('@')[0] ||
              'Usuário';
            profile = {
              id: user.id,
              username: rawUsername,
              friendCode: generateFriendCode(rawUsername),
              avatarColor: user.user_metadata?.avatar_color || '#a855f7',
              createdAt: new Date().toISOString(),
            };
            const client = getSupabaseMobileClient();
            await upsertProfileSafely(client, {
              id: profile.id,
              username: profile.username,
              friendCode: profile.friendCode,
              avatarColor: profile.avatarColor,
              email: user.email,
            });
          }
          setCurrentUserProfile(profile);
          await loadFriendsAndSyncBoards(profile);
        }
      })
      .finally(() => setIsCheckingAuth(false));
  }, []);

  // Realtime subscription + AppState foreground sync for live PC <-> Mobile updates
  useEffect(() => {
    if (!currentUserProfile) return;
    const watchedIds = [currentUserProfile.id, ...acceptedFriendIds];

    const unsubscribeRealtime = subscribeToUserBoardsRealtime(
      watchedIds,
      (ownerId: string, remotePayload: UserBoardPayload) => {
        setState((prev) => {
          const targetBoardId = remotePayload.board?.id;
          if (!targetBoardId) return prev;

          const otherCards = prev.cards.filter(
            (c) => c.boardId !== targetBoardId
          );
          const localBoardCards = prev.cards.filter(
            (c) => c.boardId === targetBoardId
          );
          const mergedBoardCards = mergeCardsByTimestamp(
            localBoardCards,
            remotePayload.cards || [],
            true
          );

          const otherLists = prev.lists.filter(
            (l) => l.boardId !== targetBoardId
          );
          const nextLists = [...otherLists, ...(remotePayload.lists || [])];

          const otherProjects = (prev.projects || []).filter(
            (p) => p.boardId !== targetBoardId
          );
          const remoteProjects = normalizeProjectsWithDefaultClient(
            remotePayload.projects || []
          ).projects;
          const nextProjects =
            remotePayload.projects !== undefined
              ? [...otherProjects, ...remoteProjects]
              : prev.projects;

          return reconcileStateWithBrasiliaTime({
            ...prev,
            lists: nextLists,
            cards: [...otherCards, ...mergedBoardCards],
            projects: nextProjects,
            clients:
              ownerId === currentUserProfile.id &&
              remotePayload.clients !== undefined
                ? normalizeClientsList(remotePayload.clients, nextProjects)
                : prev.clients,
            themeColors:
              ownerId === currentUserProfile.id &&
              remotePayload.themeColors !== undefined
                ? remotePayload.themeColors
                : prev.themeColors,
            customLabels:
              ownerId === currentUserProfile.id &&
              remotePayload.customLabels !== undefined
                ? remotePayload.customLabels
                : prev.customLabels,
            tagColors:
              ownerId === currentUserProfile.id &&
              remotePayload.tagColors !== undefined
                ? remotePayload.tagColors
                : prev.tagColors,
            lastUpdated: new Date().toISOString(),
          });
        });
      }
    );

    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setNowMs(Date.now());
        loadFriendsAndSyncBoards(currentUserProfile);
      } else if (nextAppState === 'background') {
        // Stop/pause running timers when closing/leaving the app
        const stopNow = Date.now();
        updateState((prev) => {
          const { cards: pausedCards, didPauseAny } = pauseAllRunningTimers(
            prev.cards,
            stopNow
          );
          if (!didPauseAny) return prev;
          return {
            ...prev,
            cards: pausedCards,
          };
        });
      }
    });

    return () => {
      unsubscribeRealtime();
      appStateSub.remove();
    };
  }, [currentUserProfile, acceptedFriendIds]);

  const updateState = (updater: (prev: NeonStoreState) => NeonStoreState) => {
    setState((prev) => {
      const updated = updater(prev);
      const normalizedProjects = normalizeProjectsWithDefaultClient(
        updated.projects !== undefined
          ? updated.projects
          : prev.projects ?? []
      ).projects;
      const normalizedClients = normalizeClientsList(
        updated.clients !== undefined
          ? updated.clients
          : prev.clients ?? DEFAULT_CLIENTS,
        normalizedProjects
      );
      const withDefaults: NeonStoreState = {
        ...updated,
        projects: normalizedProjects,
        clients: normalizedClients,
        themeColors:
          updated.themeColors !== undefined
            ? updated.themeColors
            : prev.themeColors ?? DEFAULT_THEME_COLORS,
        customLabels:
          updated.customLabels !== undefined
            ? updated.customLabels
            : prev.customLabels ?? DEFAULT_CUSTOM_LABELS,
        tagColors:
          updated.tagColors !== undefined
            ? updated.tagColors
            : prev.tagColors ?? DEFAULT_TAG_COLORS,
        cards: (updated.cards || []).map((c) => ({
          ...c,
          labels: sanitizeCardLabels(c.labels, updated.customLabels),
        })),
      };
      const reconciled = reconcileStateWithBrasiliaTime(withDefaults);
      const next: NeonStoreState = {
        ...reconciled,
        lastUpdated: new Date().toISOString(),
      };

      if (currentUserProfile) {
        saveLocalBoardState(currentUserProfile.id, JSON.stringify(next));

        const userLower = currentUserProfile.username.toLowerCase();
        const myBoards = next.boards.filter((b) => {
          const ownerLower = (b.owner || '').toLowerCase();
          return (
            ownerLower === userLower ||
            (userLower.includes('elbioh') && ownerLower.includes('elbioh')) ||
            (userLower.includes('didi') && ownerLower.includes('didi'))
          );
        });
        const primaryBoard = myBoards[0] || next.boards[0];
        if (primaryBoard) {
          const myBoardIds = new Set(myBoards.map((b) => b.id));
          saveUserBoardToCloudMobile(currentUserProfile.id, {
            board: primaryBoard,
            boards: myBoards.length > 0 ? myBoards : [primaryBoard],
            lists: next.lists.filter((l) => myBoardIds.has(l.boardId)),
            cards: next.cards.filter((c) => myBoardIds.has(c.boardId)),
            projects: (next.projects || []).filter((p) =>
              myBoardIds.has(p.boardId)
            ),
            clients: next.clients,
            themeColors: next.themeColors,
            customLabels: next.customLabels,
            tagColors: next.tagColors,
          });
        }
      }

      return next;
    });
  };

  // Project, Client & Theme Handlers
  const handleAddClient = (clientName: string) => {
    const trimmed = clientName.trim();
    if (!trimmed) return;
    updateState((prev) => {
      const current = prev.clients || DEFAULT_CLIENTS;
      if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        clients: [...current, trimmed],
      };
    });
  };

  const handleDeleteClient = (clientName: string) => {
    updateState((prev) => ({
      ...prev,
      clients: (prev.clients || DEFAULT_CLIENTS).filter(
        (c) => c !== clientName
      ),
    }));
  };

  const handleCreateProject = (data: {
    title: string;
    clientName: string;
    description?: string;
    amountUsd: number;
    paymentMethod?: ProjectPaymentMethod;
    color?: string;
  }) => {
    const cleanClient = data.clientName.trim() || 'Brody';
    const newProj: WorkProject = {
      id: `proj-${Date.now()}`,
      boardId: activeBoard.id,
      title: data.title,
      clientName: cleanClient,
      description: data.description,
      amountUsd: data.amountUsd,
      paymentMethod: data.paymentMethod || 'wise',
      color: data.color || '#a855f7',
      status: 'active',
      order: 0,
      manualSeconds: 0,
      createdAt: new Date().toISOString(),
    };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    updateState((prev) => {
      const currentClients = prev.clients || DEFAULT_CLIENTS;
      const nextClients = currentClients.some(
        (c) => c.toLowerCase() === cleanClient.toLowerCase()
      )
        ? currentClients
        : [...currentClients, cleanClient];
      const existingProjs = (prev.projects || []).map((p, idx) =>
        p.boardId === activeBoard.id && p.status === 'active'
          ? { ...p, order: (p.order ?? idx) + 1 }
          : p
      );
      return {
        ...prev,
        clients: nextClients,
        projects: [newProj, ...existingProjs],
      };
    });
  };

  const handleMoveProject = (
    projectId: string,
    direction: 'left' | 'right'
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateState((prev) => {
      const allProjs = [...(prev.projects || [])];
      const target = allProjs.find((p) => p.id === projectId);
      if (!target) return prev;
      const targetYm = getProjectMonthKey(target);
      const isPeer = (p: WorkProject) =>
        p.boardId === target.boardId &&
        p.status === target.status &&
        (target.status === 'active' || getProjectMonthKey(p) === targetYm);

      const peers = allProjs
        .filter(isPeer)
        .sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          if (target.status === 'completed') {
            return (b.completedAt || '').localeCompare(a.completedAt || '');
          }
          return 0;
        });

      const fromIdx = peers.findIndex((p) => p.id === projectId);
      if (fromIdx === -1) return prev;
      const toIdx =
        direction === 'left'
          ? Math.max(0, fromIdx - 1)
          : Math.min(peers.length - 1, fromIdx + 1);
      if (fromIdx === toIdx) return prev;

      const reorderedPeers = [...peers];
      const [moved] = reorderedPeers.splice(fromIdx, 1);
      reorderedPeers.splice(toIdx, 0, moved);

      const orderedPeersList = reorderedPeers.map((p, idx) => ({
        ...p,
        order: idx,
      }));
      const peerIdSet = new Set(orderedPeersList.map((p) => p.id));
      let peerCursor = 0;
      const nextProjects = allProjs.map((p) =>
        peerIdSet.has(p.id) ? orderedPeersList[peerCursor++] : p
      );

      return {
        ...prev,
        projects: nextProjects,
      };
    });
  };

  const handleUpdateProject = (updated: WorkProject) => {
    updateState((prev) => ({
      ...prev,
      projects: (prev.projects || []).map((p) =>
        p.id === updated.id ? updated : p
      ),
    }));
  };

  const handleCompleteProject = (projectId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    updateState((prev) => ({
      ...prev,
      projects: (prev.projects || []).map((p) =>
        p.id === projectId
          ? {
              ...p,
              status: 'completed',
              completedAt: new Date().toISOString(),
            }
          : p
      ),
    }));
  };

  const handleRestoreProject = (projectId: string) => {
    updateState((prev) => ({
      ...prev,
      projects: (prev.projects || []).map((p) =>
        p.id === projectId
          ? {
              ...p,
              status: 'active',
              completedAt: undefined,
            }
          : p
      ),
    }));
  };

  const handleDeleteProject = (projectId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    updateState((prev) => ({
      ...prev,
      projects: (prev.projects || []).filter((p) => p.id !== projectId),
      cards: prev.cards.map((c) =>
        c.projectId === projectId ? { ...c, projectId: undefined } : c
      ),
    }));
  };

  const handleAssignCardProject = (
    cardId: string,
    projectId: string | undefined
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateState((prev) => {
      const target = prev.cards.find((c) => c.id === cardId);
      if (!target) return prev;
      const groupId = target.recurrence?.groupId;
      return {
        ...prev,
        cards: prev.cards.map((c) => {
          if (
            c.id === cardId ||
            (groupId && c.recurrence?.groupId === groupId)
          ) {
            return {
              ...c,
              projectId,
              updatedAt: Date.now(),
            };
          }
          return c;
        }),
      };
    });
  };

  const handleUpdateThemeColors = (nextTheme: ThemeColors) => {
    updateState((prev) => ({
      ...prev,
      themeColors: nextTheme,
    }));
  };

  const handleUpdateUsdToBrlRate = (rate: number) => {
    updateState((prev) => ({
      ...prev,
      themeColors: {
        ...(prev.themeColors || DEFAULT_THEME_COLORS),
        usdToBrlRate: rate,
      },
    }));
  };

  const handleMoveCardToDate = (cardId: string, targetIsoDate: string) => {
    updateState((prev) => ({
      ...prev,
      cards: shiftTaskAndGroupToDate(
        prev.cards,
        prev.lists,
        cardId,
        targetIsoDate
      ),
    }));
  };

  // Task & Color Handlers
  const handleToggleTimer = (cardId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const now = Date.now();
    setNowMs(now);
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === cardId ? toggleCardTimerState(c, now) : c
      ),
    }));
  };

  const handleResetTimer = (cardId: string) => {
    const now = Date.now();
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              status: c.status === 'in_progress' ? 'todo' : c.status,
              elapsedSeconds: 0,
              timerStartedAt: undefined,
              updatedAt: now,
            }
          : c
      ),
    }));
  };

  const handleAdjustCardTimer = (
    cardId: string,
    mode: 'add' | 'set',
    secondsValue: number
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const now = Date.now();
    setNowMs(now);
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => {
        if (c.id !== cardId) return c;
        const currentElapsed = getLiveElapsedSeconds(c, now);
        const nextElapsed =
          mode === 'add'
            ? Math.max(0, currentElapsed + secondsValue)
            : Math.max(0, secondsValue);
        let nextStatus = c.status;
        if (c.status === 'todo' && nextElapsed > 0) {
          nextStatus = 'paused';
        } else if (c.status === 'paused' && nextElapsed === 0) {
          nextStatus = 'todo';
        }
        return {
          ...c,
          status: nextStatus,
          elapsedSeconds: nextElapsed,
          timerStartedAt: c.status === 'in_progress' ? now : undefined,
          updatedAt: now,
        };
      }),
    }));
  };

  const handleCompleteCard = (cardId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    const now = Date.now();
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => {
        if (c.id !== cardId) return c;
        const isReopening = c.status === 'completed';
        const totalElapsed = getLiveElapsedSeconds(c, now);
        const listObj = prev.lists.find((l) => l.id === c.listId);
        return {
          ...c,
          status: isReopening ? 'todo' : 'completed',
          elapsedSeconds: totalElapsed,
          timerStartedAt: undefined,
          completedAt: isReopening ? undefined : new Date(now).toISOString(),
          completedFromListTitle: isReopening ? undefined : listObj?.title,
          updatedAt: now,
        };
      }),
    }));
  };

  const handleUpdateCard = (updated: TaskCard) => {
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleDeleteCard = (cardId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.id !== cardId),
    }));
  };

  const handleAddTagColor = (hex: string, name?: string) => {
    const cleanHex = hex.trim();
    if (!cleanHex) return;
    const newItem: TagColorItem = {
      id: `col-${Date.now()}`,
      name: name || cleanHex.toUpperCase(),
      hex: cleanHex,
    };
    updateState((prev) => ({
      ...prev,
      tagColors: [newItem, ...(prev.tagColors || DEFAULT_TAG_COLORS)],
    }));
  };

  const handleDeleteTagColor = (colorId: string) => {
    const target = (state.tagColors || DEFAULT_TAG_COLORS).find(
      (c) => c.id === colorId
    );
    updateState((prev) => ({
      ...prev,
      tagColors: (prev.tagColors || DEFAULT_TAG_COLORS).filter(
        (c) => c.id !== colorId
      ),
    }));
    if (target && newTagColor === target.hex) {
      const remaining = (state.tagColors || DEFAULT_TAG_COLORS).filter(
        (c) => c.id !== colorId
      );
      setNewTagColor(remaining[0]?.hex || '#a855f7');
    }
  };

  const handleResetTagColors = () => {
    updateState((prev) => ({
      ...prev,
      tagColors: DEFAULT_TAG_COLORS,
    }));
    setNewTagColor(DEFAULT_TAG_COLORS[0]?.hex || '#a855f7');
  };

  const handleCreateLabel = (name: string, color: string) => {
    const newLbl: CustomLabel = {
      id: `lbl-${Date.now()}`,
      name,
      color,
    };
    updateState((prev) => ({
      ...prev,
      customLabels: [...(prev.customLabels || DEFAULT_CUSTOM_LABELS), newLbl],
    }));
  };

  const handleDeleteLabel = (labelId: string) => {
    setNewLabels((prev) => prev.filter((id) => id !== labelId));
    updateState((prev) => ({
      ...prev,
      customLabels: (prev.customLabels || DEFAULT_CUSTOM_LABELS).filter(
        (l) => l.id !== labelId
      ),
      cards: prev.cards.map((c) => ({
        ...c,
        labels: c.labels.filter((lbl) => lbl !== labelId),
      })),
    }));
  };

  const handleResetCustomLabels = () => {
    updateState((prev) => ({
      ...prev,
      customLabels: DEFAULT_CUSTOM_LABELS,
    }));
  };

  const handleTransferCardToBoard = (cardId: string, targetBoardId: string) => {
    const targetBoard = state.boards.find((b) => b.id === targetBoardId);
    if (!targetBoard) return;
    const targetLists = state.lists.filter((l) => l.boardId === targetBoardId);
    const todayTarget =
      targetLists.find((l) => isTodayListTitle(l.title)) || targetLists[0];
    if (!todayTarget) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              boardId: targetBoardId,
              listId: todayTarget.id,
              assignee: targetBoard.owner,
              updatedAt: Date.now(),
            }
          : c
      ),
    }));
  };

  const handleQuickCreateCard = (overrideDateIso?: string) => {
    if (!newTitle.trim()) return;
    const activeList =
      boardLists.find((l) => l.id === activeListId) || boardLists[0];
    if (!activeList) return;

    let baseDate = overrideDateIso || newDate || getTodayIsoDate();
    if (!overrideDateIso) {
      if (isYesterdayListTitle(activeList.title)) {
        baseDate = getYesterdayIsoDate();
      } else if (isTodayListTitle(activeList.title)) {
        baseDate = getTodayIsoDate();
      } else if (isTomorrowListTitle(activeList.title)) {
        baseDate = getTomorrowIsoDate();
      }
    }

    const builtCards = buildRecurringTaskCards({
      title: newTitle.trim(),
      boardId: activeBoard.id,
      defaultListId: activeList.id,
      boardLists,
      baseScheduledDate: baseDate,
      startTime: newStart,
      endTime: newEnd,
      label: sanitizeCardLabels(newLabels, state.customLabels),
      categoryTag: newTag.trim() ? newTag.trim().toUpperCase() : undefined,
      tagColor: newTag.trim() ? newTagColor : undefined,
      assignee: activeBoard.owner,
      baseOrder: state.cards.length,
      recurrence: newRecurrence,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    updateState((prev) => ({
      ...prev,
      cards: [...prev.cards, ...builtCards],
    }));

    setNewTitle('');
    setNewTag('');
    setIsAddingCard(false);
  };

  const activeListObj = useMemo(
    () => boardLists.find((l) => l.id === activeListId) || boardLists[0],
    [boardLists, activeListId]
  );

  const activeColumnCards = useMemo(() => {
    if (!activeListObj) return [];
    return state.cards
      .filter(
        (c) =>
          c.boardId === activeBoard.id &&
          c.listId === activeListObj.id &&
          c.status !== 'completed'
      )
      .sort(compareCardsByTimeOfDay);
  }, [state.cards, activeBoard.id, activeListObj]);

  const selectedCard = useMemo(
    () => state.cards.find((c) => c.id === selectedCardId) || null,
    [state.cards, selectedCardId]
  );

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const br = getBrasiliaNow();
    const targetMonthDate = new Date(
      br.getFullYear(),
      br.getMonth() + calMonthOffset,
      1
    );
    const year = targetMonthDate.getFullYear();
    const month = targetMonthDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days: { iso: string; dayNum: number; count: number }[] = [];

    for (let d = 1; d <= totalDays; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      const count = state.cards.filter(
        (c) =>
          c.boardId === activeBoard.id &&
          c.scheduledDate === iso &&
          c.status !== 'completed'
      ).length;
      days.push({ iso, dayNum: d, count });
    }
    return {
      year,
      monthName: targetMonthDate.toLocaleString('pt-BR', { month: 'long' }),
      days,
    };
  }, [calMonthOffset, state.cards, activeBoard.id]);

  const completedBoardCards = useMemo(() => {
    return state.cards
      .filter((c) => c.boardId === activeBoard.id && c.status === 'completed')
      .sort((a, b) =>
        (b.completedAt || '').localeCompare(a.completedAt || '')
      );
  }, [state.cards, activeBoard.id]);

  const totalCompletedSeconds = useMemo(() => {
    return completedBoardCards.reduce(
      (acc, c) => acc + (c.elapsedSeconds || 0),
      0
    );
  }, [completedBoardCards]);

  const themeColors = state.themeColors || DEFAULT_THEME_COLORS;
  const primaryColor = themeColors.primaryColor || '#a855f7';
  const secondaryColor = themeColors.secondaryColor || '#06b6d4';
  const backgroundColor = themeColors.backgroundColor || '#07050d';
  const isDidiUser = Boolean(
    currentUserProfile?.username?.toLowerCase().includes('didi')
  );
  const appBrandName = isDidiUser ? 'SHADOWJOKER' : 'NEON';

  const handleManualOtaCheck = async () => {
    try {
      if (__DEV__ || !Updates.isEnabled) {
        Alert.alert('Neon v1.5.7', 'Você já está na versão mais recente (v1.5.7).');
        return;
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Atualização Encontrada!',
          'Baixando e aplicando nova atualização OTA...'
        );
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } else {
        Alert.alert(
          'Neon v1.5.7 Atualizado',
          'Seu aplicativo já está na versão mais recente!'
        );
      }
    } catch {
      Alert.alert(
        'Neon v1.5.7',
        'Versão atual: v1.5.7 (Sincronizada com PC).'
      );
    }
  };

  if (isCheckingAuth) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingScreen} edges={['top', 'bottom', 'left', 'right']}>
          <StatusBar barStyle="light-content" />
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text style={styles.loadingText}>Sincronizando Neon Mobile...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!currentUserProfile) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <StatusBar barStyle="light-content" />
          <AuthModalMobile
            visible={true}
            fullScreen={true}
            onAuthenticated={async (prof) => {
              setCurrentUserProfile(prof);
              await loadFriendsAndSyncBoards(prof);
            }}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor }]}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <StatusBar barStyle="light-content" />

      {/* TOP BAR: Brand, Friends, Account, Version & Theme Settings */}
      <View
        style={[
          styles.topHeader,
          { borderColor: `${primaryColor}38` },
        ]}
      >
        <View style={styles.brandWrap}>
          <Text style={[styles.brandLogo, { color: secondaryColor }]}>
            ⚡ {appBrandName}
          </Text>
          <View style={styles.liveDot} />
        </View>

        <View style={styles.topActions}>
          {currentUserProfile ? (
            <>
              <Pressable
                onPress={() => setIsFriendsModalOpen(true)}
                style={[
                  styles.friendsBtn,
                  { borderColor: `${secondaryColor}55` },
                ]}
              >
                <Text style={styles.friendsBtnText}>👥 Amigos</Text>
                {pendingFriendCount > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>
                      {pendingFriendCount}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={async () => {
                  await signOutUserMobile();
                  setCurrentUserProfile(null);
                }}
                style={[
                  styles.userPill,
                  { borderColor: currentUserProfile.avatarColor || primaryColor },
                ]}
              >
                <View
                  style={[
                    styles.userAvatarSmall,
                    {
                      backgroundColor:
                        currentUserProfile.avatarColor || primaryColor,
                    },
                  ]}
                >
                  <Text style={styles.userAvatarText}>
                    {getUserInitials(currentUserProfile.username)}
                  </Text>
                </View>
                <Text style={styles.userNameText} numberOfLines={1}>
                  {currentUserProfile.username}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => setIsAuthModalOpen(true)}
              style={[styles.loginBtn, { backgroundColor: primaryColor }]}
            >
              <Text style={styles.loginBtnText}>Entrar / Criar Conta</Text>
            </Pressable>
          )}

          {/* Version Pill + Theme Settings Button beside it */}
          <Pressable
            onPress={handleManualOtaCheck}
            style={[
              styles.versionPill,
              { borderColor: `${primaryColor}55` },
            ]}
          >
            <Text style={styles.versionPillText}>v1.5.7</Text>
          </Pressable>

          <Pressable
            onPress={() => setIsThemeModalOpen(true)}
            style={[
              styles.themeBtn,
              { borderColor: `${secondaryColor}60` },
            ]}
          >
            <Text style={styles.themeBtnText}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {/* BOARD SWITCHER BAR (Your Board + Friends' Duo Boards) */}
      <View style={styles.boardBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.boardPillsRow}>
            {state.boards.map((b) => {
              const isSelected = b.id === activeBoard.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() =>
                    setState((prev) => ({ ...prev, activeBoardId: b.id }))
                  }
                  style={[
                    styles.boardPill,
                    isSelected && styles.boardPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.boardPillText,
                      isSelected && styles.boardPillTextActive,
                    ]}
                  >
                    {b.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* MAIN CONTENT AREA */}
      {activeTab === 'projects' && (
        <ProjectsTabMobile
          boardId={activeBoard.id}
          boardName={activeBoard.name}
          projects={state.projects || []}
          clients={state.clients || DEFAULT_CLIENTS}
          cards={state.cards}
          nowMs={nowMs}
          usdToBrlRate={
            themeColors.usdToBrlRate || DEFAULT_THEME_COLORS.usdToBrlRate || 5.8
          }
          themeColors={themeColors}
          onUpdateUsdToBrlRate={handleUpdateUsdToBrlRate}
          onAddClient={handleAddClient}
          onDeleteClient={handleDeleteClient}
          onCreateProject={handleCreateProject}
          onUpdateProject={handleUpdateProject}
          onCompleteProject={handleCompleteProject}
          onRestoreProject={handleRestoreProject}
          onDeleteProject={handleDeleteProject}
          onMoveProject={handleMoveProject}
          onAssignCardProject={handleAssignCardProject}
        />
      )}

      {activeTab === 'board' && (
        <View style={{ flex: 1 }}>
          {/* Column Selector Pills (Yesterday, Today, Tomorrow, This Week, Future) */}
          <View style={styles.columnsTabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.columnPillsRow}>
                {boardLists.map((list) => {
                  const isActive = list.id === activeListObj?.id;
                  const count = state.cards.filter(
                    (c) =>
                      c.boardId === activeBoard.id &&
                      c.listId === list.id &&
                      c.status !== 'completed'
                  ).length;
                  const isOverdue = isYesterdayListTitle(list.title) && count > 0;

                  return (
                    <Pressable
                      key={list.id}
                      onPress={() => setActiveListId(list.id)}
                      style={[
                        styles.columnPill,
                        isActive && styles.columnPillActive,
                        isOverdue && !isActive && styles.columnPillOverdue,
                      ]}
                    >
                      <Text
                        style={[
                          styles.columnPillTitle,
                          isActive && styles.columnPillTitleActive,
                        ]}
                      >
                        {list.title}
                      </Text>
                      <View
                        style={[
                          styles.columnCountBadge,
                          isActive && styles.columnCountBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.columnCountText,
                            isActive && { color: '#07050d' },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Cards List inside Selected Column */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
          >
            {/* Quick Add Card Trigger / Inline Form */}
            {!isAddingCard ? (
              <Pressable
                onPress={() => setIsAddingCard(true)}
                style={styles.addCardTriggerBtn}
              >
                <Text style={styles.addCardTriggerText}>+ Add card</Text>
              </Pressable>
            ) : (
              <View style={styles.inlineCreatorCard}>
                <TextInput
                  style={styles.inlineTitleInput}
                  placeholder="O que precisa ser feito?"
                  placeholderTextColor="#64748b"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  autoFocus
                />

                <View style={styles.inlineTimeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Início</Text>
                    <TimeInput24hMobile
                      label="Início da Tarefa"
                      value={newStart}
                      onChange={(v) => {
                        setNewStart(v);
                        setNewEnd((prevEnd) => syncEndTimeWithStart(v, prevEnd));
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Fim</Text>
                    <TimeInput24hMobile
                      label="Fim da Tarefa"
                      value={newEnd}
                      onChange={(v) => setNewEnd(clampEndTime(newStart, v))}
                    />
                  </View>
                  <View style={{ justifyContent: 'flex-end' }}>
                    <Pressable
                      onPress={() => {
                        const exactNow = getCurrentTime24h();
                        setNewStart(exactNow);
                        setNewEnd(addMinutesToTime24h(exactNow, 60));
                      }}
                      style={{
                        backgroundColor: 'rgba(34, 211, 238, 0.18)',
                        borderWidth: 1,
                        borderColor: '#22d3ee',
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 9,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: '#a5f3fc',
                          fontSize: 11,
                          fontWeight: '900',
                        }}
                      >
                        ⚡ Agora
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={{ marginBottom: 8 }}>
                  <Text style={styles.miniLabel}>Tag</Text>
                  <TextInput
                    style={[
                      styles.miniInput,
                      { color: newTagColor, borderColor: newTagColor },
                    ]}
                    value={newTag}
                    onChangeText={(t) => setNewTag(t.toUpperCase())}
                    placeholder="EX: VÍDEO"
                    placeholderTextColor="#64748b"
                  />
                </View>

                {/* Inline Tag Colors with Delete (×) on ALL colors */}
                <View style={styles.inlineColorsRow}>
                  {(state.tagColors || DEFAULT_TAG_COLORS).map((tc) => (
                    <View key={tc.id} style={styles.inlineColorItem}>
                      <Pressable
                        onPress={() => setNewTagColor(tc.hex)}
                        style={[
                          styles.inlineColorDot,
                          { backgroundColor: tc.hex },
                          newTagColor === tc.hex && styles.inlineColorDotActive,
                        ]}
                      />
                      <Pressable
                        onPress={() => handleDeleteTagColor(tc.id)}
                        style={styles.inlineDeleteBadge}
                      >
                        <Text style={styles.inlineDeleteText}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                  {(state.tagColors || DEFAULT_TAG_COLORS).length <
                    DEFAULT_TAG_COLORS.length && (
                    <Pressable onPress={handleResetTagColors}>
                      <Text style={styles.restoreMiniText}>Restaurar</Text>
                    </Pressable>
                  )}
                </View>

                {/* Inline Priority Labels with Delete (×) on ALL labels */}
                <View style={styles.inlineLabelsRow}>
                  {(state.customLabels || DEFAULT_CUSTOM_LABELS).map((lbl) => {
                    const selected = sanitizeCardLabels(
                      newLabels,
                      state.customLabels
                    ).includes(lbl.id);
                    return (
                      <View key={lbl.id} style={styles.inlineLabelWrap}>
                        <Pressable
                          onPress={() =>
                            setNewLabels((prev) =>
                              toggleLabelSelection(
                                prev,
                                lbl.id,
                                state.customLabels
                              )
                            )
                          }
                          style={[
                            styles.inlineLabelPill,
                            selected && {
                              borderColor: lbl.color,
                              backgroundColor: `${lbl.color}30`,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.inlineLabelDot,
                              { backgroundColor: lbl.color },
                            ]}
                          />
                          <Text
                            style={[
                              styles.inlineLabelText,
                              selected && { color: '#ffffff' },
                            ]}
                          >
                            {lbl.name}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteLabel(lbl.id)}
                          style={styles.inlineDeleteBadge}
                        >
                          <Text style={styles.inlineDeleteText}>×</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                  {(state.customLabels || DEFAULT_CUSTOM_LABELS).length <
                    DEFAULT_CUSTOM_LABELS.length && (
                    <Pressable onPress={handleResetCustomLabels}>
                      <Text style={styles.restoreMiniText}>Restaurar</Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.inlineCreatorFooter}>
                  <Pressable
                    onPress={() => setIsAddingCard(false)}
                    style={styles.cancelCreatorBtn}
                  >
                    <Text style={styles.cancelCreatorText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleQuickCreateCard()}
                    style={styles.confirmCreatorBtn}
                  >
                    <Text style={styles.confirmCreatorText}>+ Adicionar</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {activeColumnCards.length === 0 ? (
              <View style={styles.emptyColBox}>
                <Text style={styles.emptyColTitle}>
                  Nenhuma tarefa em {activeListObj?.title}
                </Text>
                <Text style={styles.emptyColSub}>
                  Toque em "+ Add card" acima para planejar sua rotina.
                </Text>
              </View>
            ) : (
              activeColumnCards.map((card) => {
                const liveSec = getLiveElapsedSeconds(card, nowMs);
                const isRunning = card.status === 'in_progress';
                const period = getDayPeriodKey(card.startTime);
                const periodBorderColor =
                  period === 'morning'
                    ? 'rgba(34, 211, 238, 0.45)'
                    : period === 'afternoon'
                    ? 'rgba(250, 204, 21, 0.45)'
                    : 'rgba(99, 102, 241, 0.45)';
                const periodBgColor =
                  period === 'morning'
                    ? '#0a1929'
                    : period === 'afternoon'
                    ? '#1c1608'
                    : '#0d0b21';

                const doneCheck = (card.checklist || []).filter(
                  (i) => i.completed
                ).length;
                const totalCheck = (card.checklist || []).length;

                return (
                  <Pressable
                    key={card.id}
                    onPress={() => setSelectedCardId(card.id)}
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: periodBgColor,
                        borderColor: isRunning ? '#22d3ee' : periodBorderColor,
                      },
                    ]}
                  >
                    {/* Top Row: Labels & Category Tag */}
                    <View style={styles.cardTopMeta}>
                      <View style={styles.cardLabelsRow}>
                        {sanitizeCardLabels(
                          card.labels,
                          state.customLabels
                        ).map((lblKey) => {
                          const info = resolveLabelInfo(
                            lblKey,
                            state.customLabels
                          );
                          return (
                            <View
                              key={lblKey}
                              style={[
                                styles.cardLabelBadge,
                                {
                                  backgroundColor: `${info.color}28`,
                                  borderColor: info.color,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.cardLabelDot,
                                  { backgroundColor: info.color },
                                ]}
                              />
                              <Text style={styles.cardLabelText}>
                                {info.name}
                              </Text>
                            </View>
                          );
                        })}
                      </View>

                      {card.categoryTag ? (
                        <View
                          style={[
                            styles.categoryBadge,
                            {
                              borderColor: card.tagColor || '#a855f7',
                              backgroundColor: `${
                                card.tagColor || '#a855f7'
                              }22`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryBadgeText,
                              { color: card.tagColor || '#e879f9' },
                            ]}
                          >
                            {card.categoryTag}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Card Title */}
                    <Text style={styles.cardTitle}>{card.title}</Text>

                    {/* Time, Date & Checklist Meta */}
                    <View style={styles.cardMetaRow}>
                      {card.startTime && (
                        <Text style={styles.cardTimeBadge}>
                          🕒 {card.startTime}
                          {card.endTime ? ` - ${card.endTime}` : ''}
                        </Text>
                      )}
                      {card.scheduledDate && (
                        <Text style={styles.cardDateBadge}>
                          📅 {formatShortDatePt(card.scheduledDate)}
                        </Text>
                      )}
                      {totalCheck > 0 && (
                        <Text style={styles.cardCheckBadge}>
                          ☑ {doneCheck}/{totalCheck}
                        </Text>
                      )}
                    </View>

                    {/* Bottom Action Bar: Project Linker, Stopwatch & Complete */}
                    <View style={styles.cardFooter}>
                      <View style={styles.stopwatchRow}>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setLinkingCardIdForProject(card.id);
                          }}
                          style={[
                            styles.cardProjectBtn,
                            card.projectId && {
                              borderColor: '#10b981',
                              backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.cardProjectBtnText,
                              card.projectId && { color: '#6ee7b7' },
                            ]}
                            numberOfLines={1}
                          >
                            💼{' '}
                            {card.projectId
                              ? (state.projects || []).find(
                                  (p) => p.id === card.projectId
                                )?.title || 'Projeto'
                              : ''}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setQuickAdjustHours('');
                            setQuickAdjustMinutes('');
                            setAdjustingTimeCardId(card.id);
                          }}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: 'rgba(34, 211, 238, 0.45)',
                            backgroundColor: 'rgba(34, 211, 238, 0.14)',
                          }}
                        >
                          <Text
                            style={{
                              color: '#a5f3fc',
                              fontSize: 10.5,
                              fontWeight: '900',
                            }}
                          >
                            +⏱
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleToggleTimer(card.id);
                          }}
                          style={[
                            styles.playTimerBtn,
                            { borderColor: secondaryColor },
                            isRunning && { backgroundColor: secondaryColor },
                          ]}
                        >
                          <Text
                            style={[
                              styles.playTimerText,
                              { color: secondaryColor },
                              isRunning && { color: '#07050d' },
                            ]}
                          >
                            {isRunning ? '⏸ PAUSAR' : '▶ INICIAR'}
                          </Text>
                        </Pressable>

                        <Text
                          style={[
                            styles.stopwatchDigits,
                            isRunning && { color: secondaryColor },
                          ]}
                        >
                          {formatStopwatch(liveSec)}
                        </Text>
                      </View>

                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCompleteCard(card.id);
                        }}
                        style={styles.quickCompleteBtn}
                      >
                        <Text style={styles.quickCompleteText}>✓ Concluir</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* CALENDAR TAB */}
      {activeTab === 'calendar' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
        >
          <View style={styles.calHeader}>
            <Pressable
              onPress={() => setCalMonthOffset((p) => p - 1)}
              style={styles.calNavBtn}
            >
              <Text style={styles.calNavText}>◀</Text>
            </Pressable>
            <Text style={styles.calTitle}>
              {calendarDays.monthName.toUpperCase()} {calendarDays.year}
            </Text>
            <Pressable
              onPress={() => setCalMonthOffset((p) => p + 1)}
              style={styles.calNavBtn}
            >
              <Text style={styles.calNavText}>▶</Text>
            </Pressable>
          </View>

          <View style={styles.calGrid}>
            {calendarDays.days.map((d) => {
              const isSelected = d.iso === selectedCalDateIso;
              const isToday = d.iso === currentBrasiliaIso;
              return (
                <Pressable
                  key={d.iso}
                  onPress={() => setSelectedCalDateIso(d.iso)}
                  style={[
                    styles.calDayCell,
                    isSelected && styles.calDayCellSelected,
                    isToday && !isSelected && styles.calDayCellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.calDayNum,
                      isSelected && { color: '#07050d', fontWeight: '900' },
                    ]}
                  >
                    {d.dayNum}
                  </Text>
                  {d.count > 0 && (
                    <View
                      style={[
                        styles.calDotBadge,
                        isSelected && { backgroundColor: '#07050d' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDotText,
                          isSelected && { color: '#22d3ee' },
                        ]}
                      >
                        {d.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 18 }}>
            <Text style={styles.sectionTitle}>
              Tarefas de {formatShortDatePt(selectedCalDateIso)}
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
              <TextInput
                style={[styles.miniInput, { flex: 1 }]}
                placeholder="Nova tarefa neste dia..."
                placeholderTextColor="#64748b"
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <Pressable
                onPress={() => handleQuickCreateCard(selectedCalDateIso)}
                style={styles.confirmCreatorBtn}
              >
                <Text style={styles.confirmCreatorText}>+ Criar</Text>
              </Pressable>
            </View>

            {state.cards
              .filter(
                (c) =>
                  c.boardId === activeBoard.id &&
                  c.scheduledDate === selectedCalDateIso
              )
              .sort(compareCardsByTimeOfDay)
              .map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedCardId(c.id)}
                  style={styles.calTaskRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.calTaskTitle,
                        c.status === 'completed' && {
                          textDecorationLine: 'line-through',
                          color: '#64748b',
                        },
                      ]}
                    >
                      {c.title}
                    </Text>
                    <Text style={styles.calTaskTime}>
                      {c.startTime || 'Sem horário'} •{' '}
                      {formatStopwatch(getLiveElapsedSeconds(c, nowMs))}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleCompleteCard(c.id)}
                    style={styles.quickCompleteBtn}
                  >
                    <Text style={styles.quickCompleteText}>
                      {c.status === 'completed' ? '↩' : '✓'}
                    </Text>
                  </Pressable>
                </Pressable>
              ))}
          </View>
        </ScrollView>
      )}

      {/* DALE TAB (Monthly History, Projects Earnings & Graphs Bar Chart) */}
      {activeTab === 'history' && (
        <DaleTabMobile
          boards={state.boards}
          activeBoardId={activeBoard.id}
          completedCards={state.cards.filter((c) => c.status === 'completed')}
          allCards={state.cards}
          projects={state.projects || []}
          nowMs={nowMs}
          usdToBrlRate={
            themeColors.usdToBrlRate || DEFAULT_THEME_COLORS.usdToBrlRate || 5.8
          }
          themeColors={themeColors}
          onSelectCard={(id) => setSelectedCardId(id)}
          onRestoreCard={handleCompleteCard}
          onUpdateProject={handleUpdateProject}
          onRestoreProject={handleRestoreProject}
        />
      )}

      {/* BOTTOM NAVIGATION BAR (Projetos | Board | Calendário | Dale) */}
      <View
        style={[
          styles.bottomNav,
          { borderColor: `${primaryColor}45` },
        ]}
      >
        <Pressable
          onPress={() => setActiveTab('projects')}
          style={[
            styles.bottomNavItem,
            activeTab === 'projects' && [
              styles.bottomNavItemActive,
              {
                borderColor: primaryColor,
                backgroundColor: `${primaryColor}28`,
              },
            ],
          ]}
        >
          <Text
            style={[
              styles.bottomNavText,
              activeTab === 'projects' && { color: '#ffffff' },
            ]}
          >
            💼 Projetos
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('board')}
          style={[
            styles.bottomNavItem,
            activeTab === 'board' && [
              styles.bottomNavItemActive,
              {
                borderColor: secondaryColor,
                backgroundColor: `${secondaryColor}28`,
              },
            ],
          ]}
        >
          <Text
            style={[
              styles.bottomNavText,
              activeTab === 'board' && { color: secondaryColor },
            ]}
          >
            ⚡ Board
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('calendar')}
          style={[
            styles.bottomNavItem,
            activeTab === 'calendar' && [
              styles.bottomNavItemActive,
              {
                borderColor: primaryColor,
                backgroundColor: `${primaryColor}28`,
              },
            ],
          ]}
        >
          <Text
            style={[
              styles.bottomNavText,
              activeTab === 'calendar' && { color: '#ffffff' },
            ]}
          >
            📅 Calendário
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('history')}
          style={[
            styles.bottomNavItem,
            activeTab === 'history' && [
              styles.bottomNavItemActive,
              {
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.22)',
              },
            ],
          ]}
        >
          <Text
            style={[
              styles.bottomNavText,
              activeTab === 'history' && { color: '#34d399' },
            ]}
          >
            🏆 Dale
          </Text>
        </Pressable>
      </View>

      {/* MODALS & BOTTOM SHEETS */}
      <ThemeSettingsModalMobile
        visible={isThemeModalOpen}
        themeColors={themeColors}
        onUpdateThemeColors={handleUpdateThemeColors}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* Quick Task Time Adjustment Modal (+⏱ on Card) */}
      <Modal
        visible={!!adjustingTimeCardId}
        transparent
        animationType="fade"
        onRequestClose={() => setAdjustingTimeCardId(null)}
      >
        <View style={styles.projectModalOverlay}>
          <View
            style={[
              styles.projectModalBox,
              { borderColor: secondaryColor },
            ]}
          >
            {(() => {
              const targetCard = state.cards.find(
                (c) => c.id === adjustingTimeCardId
              );
              const currentSecs = targetCard
                ? getLiveElapsedSeconds(targetCard, nowMs)
                : 0;
              const isNeg =
                quickAdjustHours.trim().startsWith('-') ||
                quickAdjustMinutes.trim().startsWith('-');

              return (
                <>
                  <View style={styles.projectModalHeader}>
                    <Text style={styles.projectModalTitle}>
                      ⏱ ADICIONAR / AJUSTAR TEMPO
                    </Text>
                    <Pressable onPress={() => setAdjustingTimeCardId(null)}>
                      <Text style={styles.projectModalClose}>✕</Text>
                    </Pressable>
                  </View>

                  {targetCard && (
                    <Text
                      style={{
                        color: '#cbd5e1',
                        fontSize: 12,
                        fontWeight: '700',
                        marginBottom: 8,
                      }}
                      numberOfLines={1}
                    >
                      Tarefa: {targetCard.title} • Atual:{' '}
                      {formatStopwatch(currentSecs)}
                    </Text>
                  )}

                  <Text
                    style={{
                      color: '#67e8f9',
                      fontSize: 10.5,
                      fontWeight: '800',
                      marginBottom: 6,
                    }}
                  >
                    Adicionar rápido com 1 toque:
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginBottom: 12,
                    }}
                  >
                    {[
                      { label: '+15m', secs: 15 * 60 },
                      { label: '+30m', secs: 30 * 60 },
                      { label: '+45m', secs: 45 * 60 },
                      { label: '+1h', secs: 3600 },
                      { label: '+2h', secs: 7200 },
                    ].map((p) => (
                      <Pressable
                        key={p.label}
                        onPress={() => {
                          if (targetCard) {
                            handleAdjustCardTimer(targetCard.id, 'add', p.secs);
                          }
                          setAdjustingTimeCardId(null);
                        }}
                        style={{
                          backgroundColor: 'rgba(34, 211, 238, 0.16)',
                          borderWidth: 1,
                          borderColor: 'rgba(34, 211, 238, 0.45)',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: '#a5f3fc',
                            fontSize: 11,
                            fontWeight: '800',
                          }}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text
                    style={{
                      color: '#94a3b8',
                      fontSize: 10.5,
                      fontWeight: '800',
                      marginBottom: 6,
                    }}
                  >
                    Horas e minutos personalizados:
                  </Text>
                  <View
                    style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}
                  >
                    <View
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#07050d',
                        borderWidth: 1,
                        borderColor: 'rgba(168, 85, 247, 0.45)',
                        borderRadius: 10,
                        paddingHorizontal: 10,
                      }}
                    >
                      <TextInput
                        style={{
                          flex: 1,
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: '700',
                          paddingVertical: 8,
                        }}
                        placeholder="0 (ou -1)"
                        placeholderTextColor="#64748b"
                        value={quickAdjustHours}
                        onChangeText={setQuickAdjustHours}
                        keyboardType="numbers-and-punctuation"
                      />
                      <Text
                        style={{
                          color: '#94a3b8',
                          fontSize: 11,
                          fontWeight: '800',
                        }}
                      >
                        h
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#07050d',
                        borderWidth: 1,
                        borderColor: 'rgba(168, 85, 247, 0.45)',
                        borderRadius: 10,
                        paddingHorizontal: 10,
                      }}
                    >
                      <TextInput
                        style={{
                          flex: 1,
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: '700',
                          paddingVertical: 8,
                        }}
                        placeholder="30 (ou -15)"
                        placeholderTextColor="#64748b"
                        value={quickAdjustMinutes}
                        onChangeText={setQuickAdjustMinutes}
                        keyboardType="numbers-and-punctuation"
                      />
                      <Text
                        style={{
                          color: '#94a3b8',
                          fontSize: 11,
                          fontWeight: '800',
                        }}
                      >
                        min
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => {
                        if (!targetCard) return;
                        const rawH = quickAdjustHours.trim();
                        const rawM = quickAdjustMinutes.trim();
                        const neg =
                          rawH.startsWith('-') || rawM.startsWith('-');
                        const absH = Math.abs(
                          parseFloat(rawH.replace(',', '.')) || 0
                        );
                        const absM = Math.abs(
                          parseFloat(rawM.replace(',', '.')) || 0
                        );
                        const totalSecs = Math.round(absH * 3600 + absM * 60);
                        if (totalSecs > 0) {
                          handleAdjustCardTimer(
                            targetCard.id,
                            'add',
                            neg ? -totalSecs : totalSecs
                          );
                        }
                        setAdjustingTimeCardId(null);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: isNeg
                          ? 'rgba(244, 63, 94, 0.25)'
                          : 'rgba(168, 85, 247, 0.3)',
                        borderWidth: 1,
                        borderColor: isNeg ? '#f43f5e' : '#a855f7',
                        borderRadius: 10,
                        paddingVertical: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: '#ffffff',
                          fontSize: 11.5,
                          fontWeight: '900',
                        }}
                      >
                        {isNeg ? '- Subtrair Tempo' : '+ Somar Horas / Min'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        if (!targetCard) return;
                        const h = Math.max(
                          0,
                          parseFloat(quickAdjustHours.replace(',', '.')) || 0
                        );
                        const m = Math.max(
                          0,
                          parseFloat(quickAdjustMinutes.replace(',', '.')) || 0
                        );
                        const targetSecs = Math.round(h * 3600 + m * 60);
                        handleAdjustCardTimer(targetCard.id, 'set', targetSecs);
                        setAdjustingTimeCardId(null);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(34, 211, 238, 0.22)',
                        borderWidth: 1,
                        borderColor: '#22d3ee',
                        borderRadius: 10,
                        paddingVertical: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: '#e0f2fe',
                          fontSize: 11.5,
                          fontWeight: '900',
                        }}
                      >
                        = Definir Total
                      </Text>
                    </Pressable>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Project Assignment Bottom Sheet Modal (Never clipped inside card box!) */}
      <Modal
        visible={!!linkingCardIdForProject}
        transparent
        animationType="fade"
        onRequestClose={() => setLinkingCardIdForProject(null)}
      >
        <View style={styles.projectModalOverlay}>
          <View
            style={[
              styles.projectModalBox,
              { borderColor: primaryColor },
            ]}
          >
            <View style={styles.projectModalHeader}>
              <Text style={styles.projectModalTitle}>
                💼 VINCULAR A PROJETO
              </Text>
              <Pressable onPress={() => setLinkingCardIdForProject(null)}>
                <Text style={styles.projectModalClose}>✕</Text>
              </Pressable>
            </View>

            {(() => {
              const targetCard = state.cards.find(
                (c) => c.id === linkingCardIdForProject
              );
              const activeBoardProjs = (state.projects || []).filter(
                (p) =>
                  p.boardId === activeBoard.id &&
                  (p.status === 'active' || p.id === targetCard?.projectId)
              );

              if (activeBoardProjs.length === 0) {
                return (
                  <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={styles.emptyColSub}>
                      Nenhum projeto ativo. Crie um na aba Projetos!
                    </Text>
                    <Pressable
                      onPress={() => {
                        setLinkingCardIdForProject(null);
                        setActiveTab('projects');
                      }}
                      style={[
                        styles.confirmCreatorBtn,
                        { marginTop: 12, backgroundColor: primaryColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.confirmCreatorText,
                          { color: '#ffffff' },
                        ]}
                      >
                        Ir para Projetos
                      </Text>
                    </Pressable>
                  </View>
                );
              }

              return (
                <View style={{ gap: 8 }}>
                  {activeBoardProjs.map((proj) => {
                    const isSelected = targetCard?.projectId === proj.id;
                    return (
                      <Pressable
                        key={proj.id}
                        onPress={() => {
                          if (targetCard) {
                            handleAssignCardProject(
                              targetCard.id,
                              isSelected ? undefined : proj.id
                            );
                          }
                          setLinkingCardIdForProject(null);
                        }}
                        style={[
                          styles.projectModalItem,
                          isSelected && {
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          },
                        ]}
                      >
                        <View>
                          <Text style={styles.projectModalItemTitle}>
                            {proj.title}
                          </Text>
                          <Text style={styles.projectModalItemClient}>
                            👤 {proj.clientName || 'Brody'}
                          </Text>
                        </View>
                        {isSelected && (
                          <Text style={{ color: '#34d399', fontWeight: '900' }}>
                            ✓ Vinculado
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}

                  {targetCard?.projectId && (
                    <Pressable
                      onPress={() => {
                        handleAssignCardProject(targetCard.id, undefined);
                        setLinkingCardIdForProject(null);
                      }}
                      style={styles.projectModalUnlinkBtn}
                    >
                      <Text style={styles.projectModalUnlinkText}>
                        Desvincular Projeto
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>
      <AuthModalMobile
        visible={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={async (prof) => {
          setCurrentUserProfile(prof);
          await loadFriendsAndSyncBoards(prof);
        }}
      />

      {currentUserProfile && (
        <FriendsModalMobile
          visible={isFriendsModalOpen}
          onClose={() => setIsFriendsModalOpen(false)}
          currentUser={currentUserProfile}
          onSwitchToFriendBoard={(friendName) => {
            const target = state.boards.find(
              (b) =>
                b.owner.toLowerCase() === friendName.toLowerCase() ||
                b.name.toLowerCase().includes(friendName.toLowerCase())
            );
            if (target) {
              setState((prev) => ({ ...prev, activeBoardId: target.id }));
            }
          }}
          onFriendshipsChanged={() => loadFriendsAndSyncBoards(currentUserProfile)}
        />
      )}

      <CardDetailSheet
        card={selectedCard}
        visible={!!selectedCard}
        nowMs={nowMs}
        boards={state.boards}
        lists={boardLists}
        customLabels={state.customLabels || DEFAULT_CUSTOM_LABELS}
        tagColors={state.tagColors || DEFAULT_TAG_COLORS}
        projects={(state.projects || []).filter(
          (p) => p.boardId === activeBoard.id
        )}
        onClose={() => setSelectedCardId(null)}
        onUpdateCard={handleUpdateCard}
        onAssignProject={handleAssignCardProject}
        onMoveCardToDate={handleMoveCardToDate}
        onToggleTimer={handleToggleTimer}
        onResetTimer={handleResetTimer}
        onCompleteCard={handleCompleteCard}
        onDeleteCard={handleDeleteCard}
        onAddTagColor={handleAddTagColor}
        onDeleteTagColor={handleDeleteTagColor}
        onResetTagColors={handleResetTagColors}
        onCreateLabel={handleCreateLabel}
        onDeleteLabel={handleDeleteLabel}
        onResetCustomLabels={handleResetCustomLabels}
        onTransferCardToBoard={handleTransferCardToBoard}
      />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#07050d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#07050d',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    color: '#22d3ee',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#140d26',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  friendsBtnText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: '#e11d48',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  pendingBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#120b24',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    maxWidth: 130,
  },
  userAvatarSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  userNameText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
  },
  loginBtn: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  boardBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0a0714',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  boardPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  boardPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#130d24',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  boardPillActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderColor: '#22d3ee',
  },
  boardPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  boardPillTextActive: {
    color: '#22d3ee',
  },
  columnsTabBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  columnPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  columnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#110b22',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  columnPillActive: {
    backgroundColor: '#a855f7',
    borderColor: '#c084fc',
  },
  columnPillOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  columnPillTitle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  columnPillTitleActive: {
    color: '#ffffff',
  },
  columnCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  columnCountBadgeActive: {
    backgroundColor: '#22d3ee',
  },
  columnCountText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '900',
  },
  addCardTriggerBtn: {
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(34, 211, 238, 0.45)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  addCardTriggerText: {
    color: '#22d3ee',
    fontWeight: '900',
    fontSize: 13,
  },
  inlineCreatorCard: {
    backgroundColor: '#110b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#22d3ee',
    padding: 12,
    marginBottom: 14,
  },
  inlineTitleInput: {
    backgroundColor: '#07050d',
    borderRadius: 10,
    padding: 10,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  inlineTimeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  miniLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  miniInput: {
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: '#ffffff',
    fontSize: 12,
  },
  inlineColorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  inlineColorItem: {
    position: 'relative',
  },
  inlineColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  inlineColorDotActive: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  inlineDeleteBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineDeleteText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
  restoreMiniText: {
    color: '#94a3b8',
    fontSize: 10,
    textDecorationLine: 'underline',
  },
  inlineLabelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  inlineLabelWrap: {
    position: 'relative',
  },
  inlineLabelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inlineLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inlineLabelText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  inlineCreatorFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelCreatorBtn: {
    backgroundColor: '#380e25',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cancelCreatorText: {
    color: '#f472b6',
    fontWeight: '800',
    fontSize: 12,
  },
  confirmCreatorBtn: {
    backgroundColor: '#22d3ee',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
  confirmCreatorText: {
    color: '#07050d',
    fontWeight: '900',
    fontSize: 12,
  },
  emptyColBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyColTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyColSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  taskCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardTopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  cardLabelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardLabelText: {
    color: '#f8fafc',
    fontSize: 9,
    fontWeight: '800',
  },
  categoryBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  cardTimeBadge: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '700',
  },
  cardDateBadge: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  cardCheckBadge: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
  },
  stopwatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playTimerBtn: {
    backgroundColor: 'rgba(34, 211, 238, 0.18)',
    borderWidth: 1,
    borderColor: '#22d3ee',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  playTimerBtnActive: {
    backgroundColor: '#22d3ee',
  },
  playTimerText: {
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: '900',
  },
  stopwatchDigits: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '900',
  },
  quickCompleteBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickCompleteText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '900',
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calNavBtn: {
    backgroundColor: '#140d26',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  calNavText: {
    color: '#22d3ee',
    fontWeight: '900',
  },
  calTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calDayCell: {
    width: '12.8%',
    aspectRatio: 1,
    backgroundColor: '#110b22',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  calDayCellSelected: {
    backgroundColor: '#22d3ee',
    borderColor: '#22d3ee',
  },
  calDayCellToday: {
    borderColor: '#a855f7',
  },
  calDayNum: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  calDotBadge: {
    backgroundColor: '#a855f7',
    borderRadius: 6,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  calDotText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  calTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#110b22',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  calTaskTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  calTaskTime: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#120b24',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
  },
  statValue: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#0b0716',
    borderTopWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  bottomNavItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 12,
  },
  bottomNavItemActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.45)',
  },
  bottomNavText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomNavTextActive: {
    color: '#22d3ee',
  },
  versionPill: {
    backgroundColor: '#120b24',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  versionPillText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '900',
  },
  themeBtn: {
    backgroundColor: '#120b24',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  themeBtnText: {
    fontSize: 12,
  },
  cardProjectBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 115,
  },
  cardProjectBtnText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '800',
  },
  projectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  projectModalBox: {
    backgroundColor: '#110b22',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  projectModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 10,
  },
  projectModalTitle: {
    color: '#67e8f9',
    fontSize: 12,
    fontWeight: '900',
  },
  projectModalClose: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '900',
  },
  projectModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#07050d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 12,
  },
  projectModalItemTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  projectModalItemClient: {
    color: '#67e8f9',
    fontSize: 11,
    marginTop: 2,
  },
  projectModalUnlinkBtn: {
    backgroundColor: 'rgba(225, 29, 72, 0.16)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  projectModalUnlinkText: {
    color: '#fda4af',
    fontSize: 11,
    fontWeight: '800',
  },
});
