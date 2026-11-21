import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getCurrentTime24h } from '../core/timeUtils';

interface TimeInput24hMobileProps {
  value: string;
  onChange: (newTime: string) => void;
  label?: string;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0')
);

const QUICK_MINUTES = ['00', '15', '30', '45'];

const ALL_MINUTES_60 = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, '0')
);

export const TimeInput24hMobile: React.FC<TimeInput24hMobileProps> = ({
  value,
  onChange,
  label,
}) => {
  const [open, setOpen] = useState(false);
  const [rawInput, setRawInput] = useState(value || '09:00');
  const [liveNow, setLiveNow] = useState(() => getCurrentTime24h());

  useEffect(() => {
    setRawInput(value || '09:00');
  }, [value]);

  const parts = (value || '09:00').split(':');
  const selectedHour = parts[0] || '09';
  const selectedMinute = parts[1] || '00';

  const handleOpen = () => {
    setLiveNow(getCurrentTime24h());
    setOpen(true);
  };

  const handleSelectHour = (h: string) => {
    const next = `${h}:${selectedMinute}`;
    setRawInput(next);
    onChange(next);
  };

  const handleSelectMinute = (m: string) => {
    const next = `${selectedHour}:${m}`;
    setRawInput(next);
    onChange(next);
    setOpen(false);
  };

  const handleSelectExactNow = () => {
    const exactNow = getCurrentTime24h();
    setLiveNow(exactNow);
    setRawInput(exactNow);
    onChange(exactNow);
    setOpen(false);
  };

  const normalizeAndCommit = (str: string) => {
    const digits = str.replace(/\D/g, '');
    if (!digits) {
      setRawInput(value || '09:00');
      return;
    }
    let h = 9;
    let m = 0;
    if (digits.length <= 2) {
      h = parseInt(digits, 10);
    } else if (digits.length === 3) {
      h = parseInt(digits.slice(0, 1), 10);
      m = parseInt(digits.slice(1, 3), 10);
    } else {
      h = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2, 4), 10);
    }
    h = Math.max(0, Math.min(23, isNaN(h) ? 0 : h));
    m = Math.max(0, Math.min(59, isNaN(m) ? 0 : m));
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(
      2,
      '0'
    )}`;
    setRawInput(formatted);
    onChange(formatted);
  };

  return (
    <>
      <Pressable onPress={handleOpen} style={styles.triggerBtn}>
        <Text style={styles.clockIcon}>🕒</Text>
        <Text style={styles.triggerText}>{value || '09:00'}</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>
                🕒 {label ? `Horário — ${label}` : 'Escolher Horário (24h)'}
              </Text>
              <Pressable
                onPress={() => {
                  normalizeAndCommit(rawInput);
                  setOpen(false);
                }}
                style={styles.okBtn}
              >
                <Text style={styles.okBtnText}>✓ OK</Text>
              </Pressable>
            </View>

            {/* 1-Tap Exact Current Time + Manual Input */}
            <View style={styles.topControlsRow}>
              <Pressable
                onPress={handleSelectExactNow}
                style={styles.nowExactBtn}
              >
                <Text style={styles.nowExactBtnText}>
                  ⚡ Horário Exato Atual ({liveNow})
                </Text>
              </Pressable>

              <TextInput
                style={styles.directInput}
                value={rawInput}
                onChangeText={(txt) => {
                  let val = txt.replace(/[^\d:]/g, '');
                  if (
                    val.length === 2 &&
                    !val.includes(':') &&
                    rawInput.length === 1
                  ) {
                    val = val + ':';
                  }
                  if (val.length <= 5) {
                    setRawInput(val);
                    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(val)) {
                      onChange(val);
                    }
                  }
                }}
                onBlur={() => normalizeAndCommit(rawInput)}
                placeholder="00:00"
                placeholderTextColor="#64748b"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            {/* Hours (00..23) & Minutes (00..59) Columns */}
            <View style={styles.columnsWrap}>
              {/* Hours Column */}
              <View style={styles.hoursCol}>
                <Text style={styles.colHeaderCyan}>HORA (24H)</Text>
                <ScrollView
                  style={styles.colScroll}
                  showsVerticalScrollIndicator={true}
                >
                  <View style={styles.gridWrap}>
                    {HOURS_24.map((h) => {
                      const active = h === selectedHour;
                      return (
                        <Pressable
                          key={h}
                          onPress={() => handleSelectHour(h)}
                          style={[
                            styles.hourBtn,
                            active && styles.activeCellBtn,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cellText,
                              active && styles.activeCellText,
                            ]}
                          >
                            {h}h
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Minutes Column */}
              <View style={styles.minutesCol}>
                <Text style={styles.colHeaderPink}>
                  MINUTOS (:{selectedMinute})
                </Text>

                {/* Quick 15-min presets */}
                <View style={styles.quickMinsRow}>
                  {QUICK_MINUTES.map((qm) => {
                    const active = qm === selectedMinute;
                    return (
                      <Pressable
                        key={`qm-${qm}`}
                        onPress={() => handleSelectMinute(qm)}
                        style={[
                          styles.quickMinBtn,
                          active && styles.quickMinBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.quickMinText,
                            active && { color: '#07050d', fontWeight: '900' },
                          ]}
                        >
                          :{qm}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* All 00..59 Exact Minutes */}
                <ScrollView
                  style={styles.colScroll}
                  showsVerticalScrollIndicator={true}
                >
                  <View style={styles.gridWrap}>
                    {ALL_MINUTES_60.map((m) => {
                      const active = m === selectedMinute;
                      return (
                        <Pressable
                          key={m}
                          onPress={() => handleSelectMinute(m)}
                          style={[
                            styles.minBtn,
                            active && styles.activeCellBtn,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cellText,
                              active && styles.activeCellText,
                            ]}
                          >
                            :{m}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#090612',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.45)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  clockIcon: {
    fontSize: 12,
  },
  triggerText: {
    color: '#a5f3fc',
    fontSize: 13,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#120b24',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.5)',
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  okBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  okBtnText: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '900',
  },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  nowExactBtn: {
    flex: 1,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderWidth: 1,
    borderColor: '#22d3ee',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  nowExactBtnText: {
    color: '#a5f3fc',
    fontSize: 11.5,
    fontWeight: '900',
  },
  directInput: {
    width: 72,
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  columnsWrap: {
    flexDirection: 'row',
    gap: 10,
    height: 250,
  },
  hoursCol: {
    flex: 1,
  },
  minutesCol: {
    flex: 1.25,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(168, 85, 247, 0.25)',
    paddingLeft: 10,
  },
  colHeaderCyan: {
    color: '#67e8f9',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  colHeaderPink: {
    color: '#f0abfc',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  quickMinsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  quickMinBtn: {
    flex: 1,
    backgroundColor: 'rgba(34, 211, 238, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    borderRadius: 7,
    paddingVertical: 5,
    alignItems: 'center',
  },
  quickMinBtnActive: {
    backgroundColor: '#22d3ee',
    borderColor: '#22d3ee',
  },
  quickMinText: {
    color: '#a5f3fc',
    fontSize: 10.5,
    fontWeight: '800',
  },
  colScroll: {
    flex: 1,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  hourBtn: {
    width: '46%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  minBtn: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  activeCellBtn: {
    backgroundColor: '#a855f7',
  },
  cellText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  activeCellText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
