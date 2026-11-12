import React from 'react';
import { X, Palette, RotateCcw, Sparkles, Check } from 'lucide-react';
import { ThemeColors } from '../types';
import { DEFAULT_THEME_COLORS } from '../data/initialData';

interface ThemeSettingsModalProps {
  themeColors: ThemeColors;
  onUpdateThemeColors: (next: ThemeColors) => void;
  onClose: () => void;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return {
      r: isNaN(r) ? 168 : r,
      g: isNaN(g) ? 85 : g,
      b: isNaN(b) ? 247 : b,
    };
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return {
    r: isNaN(r) ? 168 : r,
    g: isNaN(g) ? 85 : g,
    b: isNaN(b) ? 247 : b,
  };
}

function mixHex(
  baseHex: string,
  targetHex: string,
  targetWeight: number
): string {
  const c1 = hexToRgb(baseHex);
  const c2 = hexToRgb(targetHex);
  const w = Math.max(0, Math.min(1, targetWeight));
  const r = Math.round(c1.r * (1 - w) + c2.r * w);
  const g = Math.round(c1.g * (1 - w) + c2.g * w);
  const b = Math.round(c1.b * (1 - w) + c2.b * w);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function applyThemeColorsToDocument(theme?: ThemeColors): void {
  if (typeof document === 'undefined') return;
  const primary = theme?.primaryColor || DEFAULT_THEME_COLORS.primaryColor;
  const secondary = theme?.secondaryColor || DEFAULT_THEME_COLORS.secondaryColor;
  const background =
    theme?.backgroundColor || DEFAULT_THEME_COLORS.backgroundColor;

  const root = document.documentElement;
  root.style.setProperty('--neon-primary', primary);
  root.style.setProperty('--neon-secondary', secondary);
  root.style.setProperty('--neon-bg', background);
  root.style.setProperty('--neon-surface-deep', mixHex(background, primary, 0.04));
  root.style.setProperty('--neon-surface-card', mixHex(background, primary, 0.08));
  root.style.setProperty('--neon-surface-elevated', mixHex(background, primary, 0.15));
  document.body.style.backgroundColor = background;

  // Dynamically map Tailwind v4 purple, fuchsia & violet palettes to Primary Color
  const primaryScale: Record<string, string> = {
    '50': mixHex(primary, '#ffffff', 0.9),
    '100': mixHex(primary, '#ffffff', 0.78),
    '200': mixHex(primary, '#ffffff', 0.65),
    '300': mixHex(primary, '#ffffff', 0.45),
    '400': mixHex(primary, '#ffffff', 0.22),
    '500': primary,
    '600': mixHex(primary, '#000000', 0.16),
    '700': mixHex(primary, '#000000', 0.32),
    '800': mixHex(primary, '#000000', 0.48),
    '900': mixHex(primary, background, 0.65),
    '950': mixHex(primary, background, 0.82),
  };

  Object.entries(primaryScale).forEach(([shade, hexVal]) => {
    root.style.setProperty(`--color-purple-${shade}`, hexVal);
    root.style.setProperty(`--color-fuchsia-${shade}`, hexVal);
    root.style.setProperty(`--color-violet-${shade}`, hexVal);
  });

  // Dynamically map Tailwind v4 cyan & pink palettes to Secondary Color (so Calendar, Board, Dale & Projects all follow the chosen theme!)
  const secondaryScale: Record<string, string> = {
    '50': mixHex(secondary, '#ffffff', 0.9),
    '100': mixHex(secondary, '#ffffff', 0.78),
    '200': mixHex(secondary, '#ffffff', 0.62),
    '300': mixHex(secondary, '#ffffff', 0.42),
    '400': mixHex(secondary, '#ffffff', 0.18),
    '500': secondary,
    '600': mixHex(secondary, '#000000', 0.18),
    '700': mixHex(secondary, '#000000', 0.34),
    '800': mixHex(secondary, '#000000', 0.5),
    '900': mixHex(secondary, background, 0.65),
    '950': mixHex(secondary, background, 0.82),
  };

  Object.entries(secondaryScale).forEach(([shade, hexVal]) => {
    root.style.setProperty(`--color-cyan-${shade}`, hexVal);
    root.style.setProperty(`--color-pink-${shade}`, hexVal);
  });
}

const PRESET_THEMES: Array<{
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
}> = [
  {
    id: 'neon-default',
    name: 'Neon Original',
    primaryColor: '#a855f7',
    secondaryColor: '#06b6d4',
    backgroundColor: '#07050d',
  },
  {
    id: 'cyber-edge',
    name: 'Cyberpunk 2077',
    primaryColor: '#ec4899',
    secondaryColor: '#eab308',
    backgroundColor: '#09050f',
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Focus',
    primaryColor: '#10b981',
    secondaryColor: '#3b82f6',
    backgroundColor: '#040b09',
  },
  {
    id: 'crimson-blaze',
    name: 'Crimson & Gold',
    primaryColor: '#f43f5e',
    secondaryColor: '#f59e0b',
    backgroundColor: '#0c0507',
  },
  {
    id: 'ocean-abyss',
    name: 'Deep Ocean',
    primaryColor: '#3b82f6',
    secondaryColor: '#14b8a6',
    backgroundColor: '#040812',
  },
  {
    id: 'midnight-oled',
    name: 'OLED Pure Black',
    primaryColor: '#8b5cf6',
    secondaryColor: '#22d3ee',
    backgroundColor: '#000000',
  },
];

const QUICK_PRIMARY_SWATCHES = [
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

const QUICK_SECONDARY_SWATCHES = [
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

const QUICK_BG_SWATCHES = [
  '#07050d',
  '#000000',
  '#050814',
  '#040d0a',
  '#0f050a',
  '#0a0a0f',
  '#110c1d',
  '#090d16',
  '#121212',
];

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  themeColors,
  onUpdateThemeColors,
  onClose,
}) => {
  const current: ThemeColors = {
    primaryColor:
      themeColors?.primaryColor || DEFAULT_THEME_COLORS.primaryColor,
    secondaryColor:
      themeColors?.secondaryColor || DEFAULT_THEME_COLORS.secondaryColor,
    backgroundColor:
      themeColors?.backgroundColor || DEFAULT_THEME_COLORS.backgroundColor,
    usdToBrlRate:
      themeColors?.usdToBrlRate || DEFAULT_THEME_COLORS.usdToBrlRate,
  };

  const handleColorChange = (
    field: 'primaryColor' | 'secondaryColor' | 'backgroundColor',
    value: string
  ) => {
    const updated: ThemeColors = {
      ...current,
      [field]: value,
    };
    onUpdateThemeColors(updated);
  };

  const handleReset = () => {
    onUpdateThemeColors({
      ...DEFAULT_THEME_COLORS,
      usdToBrlRate: current.usdToBrlRate,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-purple-500/35 bg-[#0d091a] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden animate-spring-pop"
        style={{ backgroundColor: mixHex(current.backgroundColor, '#140f26', 0.35) }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-black/25">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-md"
              style={{
                background: `linear-gradient(135deg, ${current.primaryColor}33, ${current.secondaryColor}33)`,
                borderColor: `${current.primaryColor}66`,
              }}
            >
              <Palette className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Configurações de Cores & Tema
              </h2>
              <p className="text-[11px] text-slate-400">
                Personalize a cor primária, secundária e o fundo do seu Neon
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Preset Themes */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Temas Prontos
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_THEMES.map((preset) => {
                const isSelected =
                  current.primaryColor.toLowerCase() ===
                    preset.primaryColor.toLowerCase() &&
                  current.secondaryColor.toLowerCase() ===
                    preset.secondaryColor.toLowerCase() &&
                  current.backgroundColor.toLowerCase() ===
                    preset.backgroundColor.toLowerCase();

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onUpdateThemeColors({
                        ...current,
                        primaryColor: preset.primaryColor,
                        secondaryColor: preset.secondaryColor,
                        backgroundColor: preset.backgroundColor,
                      })
                    }
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-white/60 bg-white/10 shadow-md'
                        : 'border-white/10 bg-black/30 hover:border-white/25 hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-[11px] font-bold text-white truncate">
                        {preset.name}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: preset.primaryColor }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: preset.secondaryColor }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-white/30"
                          style={{ backgroundColor: preset.backgroundColor }}
                        />
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. Primary Color */}
          <div className="p-3.5 rounded-xl border border-white/10 bg-black/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">
                  1. Cor Primária
                </span>
                <p className="text-[10px] text-slate-400">
                  Destaques principais, botões ativos, bordas e brilhos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={current.primaryColor}
                  onChange={(e) =>
                    handleColorChange('primaryColor', e.target.value)
                  }
                  className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={current.primaryColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      handleColorChange('primaryColor', val);
                    }
                  }}
                  className="w-20 px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-xs font-mono text-white uppercase focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_PRIMARY_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handleColorChange('primaryColor', hex)}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    current.primaryColor.toLowerCase() === hex.toLowerCase()
                      ? 'scale-115 border-white ring-2 ring-white/40'
                      : 'border-white/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>

          {/* 2. Secondary Color */}
          <div className="p-3.5 rounded-xl border border-white/10 bg-black/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">
                  2. Cor Secundária
                </span>
                <p className="text-[10px] text-slate-400">
                  Acentos secundários, relógio, indicadores e gradientes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={current.secondaryColor}
                  onChange={(e) =>
                    handleColorChange('secondaryColor', e.target.value)
                  }
                  className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={current.secondaryColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      handleColorChange('secondaryColor', val);
                    }
                  }}
                  className="w-20 px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-xs font-mono text-white uppercase focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_SECONDARY_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handleColorChange('secondaryColor', hex)}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    current.secondaryColor.toLowerCase() === hex.toLowerCase()
                      ? 'scale-115 border-white ring-2 ring-white/40'
                      : 'border-white/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>

          {/* 3. Background Color */}
          <div className="p-3.5 rounded-xl border border-white/10 bg-black/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">
                  3. Cor do Fundo
                </span>
                <p className="text-[10px] text-slate-400">
                  Cor de fundo principal da aplicação
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={current.backgroundColor}
                  onChange={(e) =>
                    handleColorChange('backgroundColor', e.target.value)
                  }
                  className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={current.backgroundColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      handleColorChange('backgroundColor', val);
                    }
                  }}
                  className="w-20 px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-xs font-mono text-white uppercase focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_BG_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handleColorChange('backgroundColor', hex)}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    current.backgroundColor.toLowerCase() === hex.toLowerCase()
                      ? 'scale-115 border-white ring-2 ring-white/40'
                      : 'border-white/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div
            className="p-4 rounded-xl border transition-all"
            style={{
              backgroundColor: current.backgroundColor,
              borderColor: `${current.primaryColor}55`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pré-visualização ao Vivo
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                  backgroundColor: `${current.secondaryColor}22`,
                  color: current.secondaryColor,
                  borderColor: `${current.secondaryColor}55`,
                }}
              >
                08:00 - 10:00
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white">
                Editar Vídeo do Projeto Principal
              </div>
              <button
                type="button"
                className="px-3 py-1 rounded-lg text-[11px] font-bold text-white shadow-md"
                style={{
                  background: `linear-gradient(90deg, ${current.primaryColor}, ${current.secondaryColor})`,
                }}
              >
                INICIAR
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-purple-500/20 bg-black/35">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg transition-all"
            style={{
              background: `linear-gradient(90deg, ${current.primaryColor}, ${current.secondaryColor})`,
            }}
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
