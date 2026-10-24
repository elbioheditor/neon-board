import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Friendship, UserProfile } from '../core/types';
import { getUserInitials } from '../core/syncMerge';
import {
  fetchFriendshipsMobile,
  respondToFriendRequestMobile,
  sendFriendRequestMobile,
} from '../adapters/supabaseMobile';

interface FriendsModalMobileProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSwitchToFriendBoard: (friendName: string) => void;
  onFriendshipsChanged: () => void;
}

export const FriendsModalMobile: React.FC<FriendsModalMobileProps> = ({
  visible,
  onClose,
  currentUser,
  onSwitchToFriendBoard,
  onFriendshipsChanged,
}) => {
  const [tab, setTab] = useState<'friends' | 'add' | 'requests'>('friends');
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [statusMsg, setStatusMsg] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  const loadList = async () => {
    setLoading(true);
    try {
      const list = await fetchFriendshipsMobile(currentUser.id);
      setFriendships(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadList();
      setStatusMsg(null);
    }
  }, [visible]);

  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');
  const pendingReceived = friendships.filter(
    (f) => f.status === 'pending' && f.friendId === currentUser.id
  );
  const pendingSent = friendships.filter(
    (f) => f.status === 'pending' && f.userId === currentUser.id
  );

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(currentUser.friendCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendRequest = async () => {
    if (!inputCode.trim()) return;
    setStatusMsg(null);
    const res = await sendFriendRequestMobile(currentUser.id, inputCode);
    setStatusMsg({ text: res.message, isError: !res.success });
    if (res.success) {
      setInputCode('');
      await loadList();
      onFriendshipsChanged();
    }
  };

  const handleRespond = async (id: string, accept: boolean) => {
    const res = await respondToFriendRequestMobile(id, accept);
    if (res.success) {
      await loadList();
      onFriendshipsChanged();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>👥 AMIGOS & DUO BOARD</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.myCodeBox}>
            <View>
              <Text style={styles.myCodeLabel}>SEU FRIEND CODE</Text>
              <Text style={styles.myCodeValue}>{currentUser.friendCode}</Text>
            </View>
            <Pressable onPress={handleCopyCode} style={styles.copyBtn}>
              <Text style={styles.copyBtnText}>
                {copied ? '✓ Copiado!' : 'Copiar'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.tabsRow}>
            <Pressable
              onPress={() => setTab('friends')}
              style={[styles.tabBtn, tab === 'friends' && styles.tabBtnActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === 'friends' && styles.tabTextActive,
                ]}
              >
                Amigos ({acceptedFriends.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab('add')}
              style={[styles.tabBtn, tab === 'add' && styles.tabBtnActive]}
            >
              <Text
                style={[styles.tabText, tab === 'add' && styles.tabTextActive]}
              >
                + Adicionar
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab('requests')}
              style={[styles.tabBtn, tab === 'requests' && styles.tabBtnActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === 'requests' && styles.tabTextActive,
                ]}
              >
                Pedidos ({pendingReceived.length})
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator
              color="#22d3ee"
              style={{ marginVertical: 30 }}
            />
          ) : (
            <ScrollView style={{ maxHeight: 340 }}>
              {tab === 'friends' && (
                <>
                  {acceptedFriends.length === 0 ? (
                    <Text style={styles.emptyText}>
                      Você ainda não adicionou amigos. Compartilhe seu Friend
                      Code para sincronizar boards em dupla!
                    </Text>
                  ) : (
                    acceptedFriends.map((f) => {
                      const fp = f.friendProfile;
                      return (
                        <View key={f.id} style={styles.friendRow}>
                          <View
                            style={[
                              styles.avatar,
                              { backgroundColor: fp?.avatarColor || '#a855f7' },
                            ]}
                          >
                            <Text style={styles.avatarText}>
                              {getUserInitials(fp?.username)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.friendName}>
                              {fp?.username || 'Amigo'}
                            </Text>
                            <Text style={styles.friendCode}>
                              {fp?.friendCode}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => {
                              if (fp?.username) {
                                onSwitchToFriendBoard(fp.username);
                                onClose();
                              }
                            }}
                            style={styles.openBoardBtn}
                          >
                            <Text style={styles.openBoardText}>Ver Board</Text>
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                </>
              )}

              {tab === 'add' && (
                <View style={{ paddingVertical: 8 }}>
                  <Text style={styles.inputLabel}>
                    Digite o Friend Code do seu amigo:
                  </Text>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="EX: DIDI#7392"
                    placeholderTextColor="#64748b"
                    autoCapitalize="characters"
                    value={inputCode}
                    onChangeText={setInputCode}
                  />
                  {statusMsg && (
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusMsg.isError ? '#f87171' : '#34d399' },
                      ]}
                    >
                      {statusMsg.text}
                    </Text>
                  )}
                  <Pressable
                    onPress={handleSendRequest}
                    style={styles.sendReqBtn}
                  >
                    <Text style={styles.sendReqText}>
                      Enviar Solicitação de Amizade
                    </Text>
                  </Pressable>
                </View>
              )}

              {tab === 'requests' && (
                <>
                  {pendingReceived.length === 0 && pendingSent.length === 0 ? (
                    <Text style={styles.emptyText}>
                      Nenhuma solicitação pendente no momento.
                    </Text>
                  ) : (
                    <>
                      {pendingReceived.map((f) => {
                        const fp = f.friendProfile;
                        return (
                          <View key={f.id} style={styles.friendRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.friendName}>
                                {fp?.username || 'Usuário'}
                              </Text>
                              <Text style={styles.friendCode}>
                                Quer compartilhar boards com você
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => handleRespond(f.id, true)}
                              style={styles.acceptBtn}
                            >
                              <Text style={styles.acceptText}>Aceitar</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleRespond(f.id, false)}
                              style={styles.rejectBtn}
                            >
                              <Text style={styles.rejectText}>✕</Text>
                            </Pressable>
                          </View>
                        );
                      })}
                      {pendingSent.map((f) => (
                        <View key={f.id} style={styles.friendRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.friendName}>
                              {f.friendProfile?.username || 'Amigo'}
                            </Text>
                            <Text style={styles.friendCode}>
                              Aguardando resposta...
                            </Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 12, 0.88)',
    justifyContent: 'center',
    padding: 18,
  },
  container: {
    backgroundColor: '#0a0715',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#22d3ee',
    fontWeight: '900',
    fontSize: 15,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 18,
  },
  myCodeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#130d26',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    marginBottom: 14,
  },
  myCodeLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  myCodeValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  copyBtn: {
    backgroundColor: '#22d3ee',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: {
    color: '#07050d',
    fontWeight: '800',
    fontSize: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#07050d',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#a855f7',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#110b22',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },
  friendName: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 14,
  },
  friendCode: {
    color: '#94a3b8',
    fontSize: 11,
  },
  openBoardBtn: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderWidth: 1,
    borderColor: '#22d3ee',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  openBoardText: {
    color: '#22d3ee',
    fontWeight: '800',
    fontSize: 11,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  codeInput: {
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  sendReqBtn: {
    backgroundColor: '#a855f7',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  sendReqText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },
  acceptBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  acceptText: {
    color: '#052e16',
    fontWeight: '900',
    fontSize: 12,
  },
  rejectBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  rejectText: {
    color: '#fca5a5',
    fontWeight: '900',
    fontSize: 12,
  },
});
