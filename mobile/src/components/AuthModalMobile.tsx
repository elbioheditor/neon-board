import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { UserProfile } from '../core/types';
import {
  setRememberMePreference,
  signInUserMobile,
  signUpUserMobile,
} from '../adapters/supabaseMobile';

interface AuthModalMobileProps {
  visible: boolean;
  onClose: () => void;
  onAuthenticated: (profile: UserProfile, isNewSignup: boolean) => void;
}

const AVATAR_COLORS = [
  '#a855f7',
  '#06b6d4',
  '#ec4899',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
];

export const AuthModalMobile: React.FC<AuthModalMobileProps> = ({
  visible,
  onClose,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [remember60Days, setRemember60Days] = useState(true);
  const [avatarColor, setAvatarColor] = useState('#a855f7');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (mode === 'login') {
      if (!username.trim() || !password) {
        setErrorMsg('Preencha seu Nick/E-mail e sua senha.');
        return;
      }
      setLoading(true);
      try {
        await setRememberMePreference(remember60Days);
        const res = await signInUserMobile(username.trim(), password);
        if (res.error || !res.profile) {
          setErrorMsg(res.error || 'Falha ao entrar.');
        } else {
          onAuthenticated(res.profile, false);
          onClose();
        }
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : 'Erro inesperado.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!username.trim() || !email.trim() || !password) {
        setErrorMsg('Preencha Nick, E-mail e Senha para criar sua conta.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('As senhas digitadas não coincidem!');
        return;
      }
      setLoading(true);
      try {
        await setRememberMePreference(remember60Days);
        const res = await signUpUserMobile(
          username.trim(),
          password,
          email.trim(),
          avatarColor
        );
        if (res.error || !res.profile) {
          setErrorMsg(res.error || 'Falha ao criar conta.');
        } else {
          onAuthenticated(res.profile, true);
          onClose();
        }
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : 'Erro inesperado.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.brandTitle}>⚡ NEON ACCOUNT</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            <Pressable
              onPress={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  mode === 'login' && styles.tabTextActive,
                ]}
              >
                Entrar
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              style={[styles.tabBtn, mode === 'signup' && styles.tabBtnActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  mode === 'signup' && styles.tabTextActive,
                ]}
              >
                Criar Conta
              </Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>
              {mode === 'login' ? 'Nick ou E-mail' : 'Seu Nick (Username)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                mode === 'login' ? 'Ex: Elbioh ou email@...' : 'Ex: Elbioh'
              }
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />

            {mode === 'signup' && (
              <>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </>
            )}

            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </Pressable>
            </View>

            {mode === 'signup' && (
              <>
                <Text style={styles.label}>Confirmar Senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Repita sua senha"
                    placeholderTextColor="#64748b"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeBtn}
                  >
                    <Text style={styles.eyeText}>
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.label}>Cor do seu Avatar</Text>
                <View style={styles.colorRow}>
                  {AVATAR_COLORS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setAvatarColor(c)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        avatarColor === c && styles.colorCircleSelected,
                      ]}
                    />
                  ))}
                </View>
              </>
            )}

            <Pressable
              onPress={() => setRemember60Days(!remember60Days)}
              style={styles.rememberRow}
            >
              <View
                style={[
                  styles.checkbox,
                  remember60Days && styles.checkboxChecked,
                ]}
              >
                {remember60Days && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>
                Manter conectado por 60 dias
              </Text>
            </Pressable>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            >
              {loading ? (
                <ActivityIndicator color="#07050d" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'login' ? 'Entrar Agora' : 'Criar Minha Conta'}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 12, 0.88)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0d091a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    padding: 20,
    maxHeight: '88%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    color: '#22d3ee',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#07050d',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#a855f7',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  eyeText: {
    fontSize: 16,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorCircleSelected: {
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#22d3ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22d3ee',
  },
  checkmark: {
    color: '#07050d',
    fontWeight: '900',
    fontSize: 12,
  },
  rememberText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#22d3ee',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitText: {
    color: '#07050d',
    fontWeight: '900',
    fontSize: 14,
    textTransform: 'uppercase',
  },
});
