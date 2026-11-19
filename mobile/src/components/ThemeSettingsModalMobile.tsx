import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ThemeColors } from '../core/types';
import { DEFAULT_THEME_COLORS } from '../core/syncMerge';

const THEME_PRESETS: {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
}[] = [
  {
    name: 'Neon Original',
    primaryColor: '#a855f7',
    secondaryColor: '#06b6d4',
    backgroundColor: '#07050d',
  },
  {
    name: 'Cyberpunk 2077',
    primaryColor: '#f43f5e',
    secondaryColor: '#facc15',
    backgroundColor: '#09070d',
  },
  {
    name: 'Emerald Focus',
    primaryColor: '#10b981',
    secondaryColor: '#3b82f6',
    backgroundColor: '#040b09',
  },
  {
    name: 'Crimson & Gold',
    primaryColor: '#ef4444',
    secondaryColor: '#f59e0b',
    backgroundColor: '#0c0506',
  },
  {
    name: 'Deep Ocean',
    primaryColor: '#3b82f6',
    secondaryColor: '#2dd4bf',
    backgroundColor: '#040914',
  },
  {
    name: 'OLED Pure Black',
    primaryColor: '#10b981',
    secondaryColor: '#10b981',
    backgroundColor: '#000000',
  },
];

const PRIMARY_SWATCHES = [
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#10b981',
  '#3b82f6',
  '#6366f1',
];

const SECONDARY_SWATCHES = [
  '#06b6d4',
  '#22d3ee',
  '#3b82f6',
  '#10b981',
  '#eab308',
  '#f97316',
  '#ec4899',
  '#a855f7',
  '#f43f5e',
];

const BG_SWATCHES = [
  '#07050d',
  '#000000',
  '#050a14',
  '#040d0a',
  '#12050b',
  '#0b0914',
  '#0d0d12',
];

interface ThemeSettingsModalMobileProps {
  visible: boolean;
  themeColors: ThemeColors;
  onUpdateThemeColors: (next: ThemeColors) => void;
  onClose: () => void;
}

export const ThemeSettingsModalMobile: React.FC<
  ThemeSettingsModalMobileProps
> = ({ visible, themeColors, onUpdateThemeColors, onClose }) => {
  if (!visible) return null;

  const updateField = (partial: Partial<ThemeColors>) => {
    onUpdateThemeColors({
      ...themeColors,
      ...partial,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            { borderColor: `${themeColors.primaryColor}70` },
          ]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>🎨 Configurações de Cores & Tema</Text>
              <Text style={styles.subtitle}>
                Personalize a cor primária, secundária e o fundo do seu Neon
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>✨ TEMAS PRONTOS</Text>
            <View style={styles.presetsGrid}>
              {THEME_PRESETS.map((preset) => (
                <Pressable
                  key={preset.name}
                  onPress={() =>
                    updateField({
                      primaryColor: preset.primaryColor,
                      secondaryColor: preset.secondaryColor,
                      backgroundColor: preset.backgroundColor,
                    })
                  }
                  style={styles.presetCard}
                >
                  <Text style={styles.presetName}>{preset.name}</Text>
                  <View style={styles.presetDotsRow}>
                    <View
                      style={[
                        styles.presetDot,
                        { backgroundColor: preset.primaryColor },
                      ]}
                    />
                    <View
                      style={[
                        styles.presetDot,
                        { backgroundColor: preset.secondaryColor },
                      ]}
                    />
                    <View
                      style={[
                        styles.presetDot,
                        {
                          backgroundColor: preset.backgroundColor,
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.35)',
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              ))}
            </View>

            {/* 1. Primary Color */}
            <View style={styles.colorBlock}>
              <View style={styles.colorBlockHeader}>
                <Text style={styles.colorTitle}>1. Cor Primária</Text>
                <TextInput
                  style={styles.hexInput}
                  value={themeColors.primaryColor}
                  onChangeText={(v) => updateField({ primaryColor: v })}
                  placeholder="#a855f7"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={styles.swatchesRow}>
                {PRIMARY_SWATCHES.map((hex) => (
                  <Pressable
                    key={hex}
                    onPress={() => updateField({ primaryColor: hex })}
                    style={[
                      styles.swatchDot,
                      { backgroundColor: hex },
                      themeColors.primaryColor.toLowerCase() ===
                        hex.toLowerCase() && styles.swatchSelected,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* 2. Secondary Color */}
            <View style={styles.colorBlock}>
              <View style={styles.colorBlockHeader}>
                <Text style={styles.colorTitle}>2. Cor Secundária</Text>
                <TextInput
                  style={styles.hexInput}
                  value={themeColors.secondaryColor}
                  onChangeText={(v) => updateField({ secondaryColor: v })}
                  placeholder="#06b6d4"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={styles.swatchesRow}>
                {SECONDARY_SWATCHES.map((hex) => (
                  <Pressable
                    key={hex}
                    onPress={() => updateField({ secondaryColor: hex })}
                    style={[
                      styles.swatchDot,
                      { backgroundColor: hex },
                      themeColors.secondaryColor.toLowerCase() ===
                        hex.toLowerCase() && styles.swatchSelected,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* 3. Background Color */}
            <View style={styles.colorBlock}>
              <View style={styles.colorBlockHeader}>
                <Text style={styles.colorTitle}>3. Cor do Fundo</Text>
                <TextInput
                  style={styles.hexInput}
                  value={themeColors.backgroundColor}
                  onChangeText={(v) => updateField({ backgroundColor: v })}
                  placeholder="#07050d"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={styles.swatchesRow}>
                {BG_SWATCHES.map((hex) => (
                  <Pressable
                    key={hex}
                    onPress={() => updateField({ backgroundColor: hex })}
                    style={[
                      styles.swatchDot,
                      {
                        backgroundColor: hex,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.25)',
                      },
                      themeColors.backgroundColor.toLowerCase() ===
                        hex.toLowerCase() && styles.swatchSelected,
                    ]}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            <Pressable
              onPress={() =>
                updateField({
                  primaryColor: DEFAULT_THEME_COLORS.primaryColor,
                  secondaryColor: DEFAULT_THEME_COLORS.secondaryColor,
                  backgroundColor: DEFAULT_THEME_COLORS.backgroundColor,
                })
              }
              style={styles.resetBtn}
            >
              <Text style={styles.resetText}>↺ Restaurar Padrão</Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={[
                styles.doneBtn,
                { backgroundColor: themeColors.primaryColor },
              ]}
            >
              <Text style={styles.doneText}>Concluído</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#110b22',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    padding: 18,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '900',
  },
  sectionLabel: {
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  presetCard: {
    width: '31%',
    backgroundColor: '#07050d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    gap: 6,
  },
  presetName: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  presetDotsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  presetDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  colorBlock: {
    backgroundColor: '#07050d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  colorBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  hexInput: {
    backgroundColor: '#110b22',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    width: 82,
    textAlign: 'center',
  },
  swatchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatchDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  swatchSelected: {
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  resetBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  resetText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
  },
  doneBtn: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  doneText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
});
