import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING, ROADTRIP_STATUS } from '../theme';
import { useRoadtripStore } from '../store/roadtripStore';

const STATUSES = ['DRAFT', 'PLANNED', 'ONGOING', 'COMPLETED'];

export default function CreateRoadtripScreen({ navigation }) {
  const formatDisplay = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const today = new Date();
  const plus10 = new Date(today); plus10.setDate(today.getDate() + 10);

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(plus10);
  const [status, setStatus] = useState('DRAFT');
  const [loading, setLoading] = useState(false);

  // Picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // 'start' | 'end'
  const [pickerTemp, setPickerTemp] = useState(today);

  const { createRoadtrip } = useRoadtripStore();

  const openPicker = (target) => {
    setPickerTarget(target);
    setPickerTemp(target === 'start' ? startDate : endDate);
    setPickerVisible(true);
  };

  const confirmPicker = () => {
    if (pickerTarget === 'start') {
      setStartDate(pickerTemp);
      if (pickerTemp > endDate) setEndDate(pickerTemp);
    } else {
      setEndDate(pickerTemp);
    }
    setPickerVisible(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Champ requis', 'Le titre est obligatoire.');
      return;
    }
    setLoading(true);
    try {
      const roadtrip = await createRoadtrip({
        title: title.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status,
      });
      navigation.replace('RoadtripDetail', { id: roadtrip.id, title: roadtrip.title, roadtripData: roadtrip });
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible de créer le roadtrip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* ─── Title ──────────────────────────────────────────────────────── */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Road trip en Écosse..."
            placeholderTextColor={COLORS.textDim}
            autoFocus
          />
        </View>

        {/* ─── Dates ──────────────────────────────────────────────────────── */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Départ</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('start')}>
              <Text style={styles.dateBtnIcon}>📅</Text>
              <Text style={styles.dateBtnText}>{formatDisplay(startDate)}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Retour</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('end')}>
              <Text style={styles.dateBtnIcon}>📅</Text>
              <Text style={styles.dateBtnText}>{formatDisplay(endDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Status ─────────────────────────────────────────────────────── */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Statut</Text>
          <View style={styles.statusRow}>
            {STATUSES.map((s) => {
              const cfg = ROADTRIP_STATUS[s];
              const active = status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusChip,
                    { borderColor: active ? cfg.color : COLORS.border },
                    active && { backgroundColor: cfg.bg },
                  ]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.statusChipText, { color: active ? cfg.color : COLORS.textMuted }]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Submit ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <Text style={styles.submitBtnText}>Créer le roadtrip</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Date Picker Modal (iOS) ─────────────────────────────────────── */}
      {Platform.OS === 'ios' && (
        <Modal visible={pickerVisible} transparent animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Text style={styles.pickerCancel}>Annuler</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>
                  {pickerTarget === 'start' ? 'Date de départ' : 'Date de retour'}
                </Text>
                <TouchableOpacity onPress={confirmPicker}>
                  <Text style={styles.pickerConfirm}>OK</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerTemp}
                mode="date"
                display="spinner"
                locale="fr-FR"
                minimumDate={pickerTarget === 'end' ? startDate : undefined}
                onChange={(_, d) => d && setPickerTemp(d)}
                style={{ backgroundColor: COLORS.surface }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android : picker direct (pas de modal) */}
      {Platform.OS === 'android' && pickerVisible && (
        <DateTimePicker
          value={pickerTemp}
          mode="date"
          display="default"
          minimumDate={pickerTarget === 'end' ? startDate : undefined}
          onChange={(_, d) => {
            setPickerVisible(false);
            if (d) {
              if (pickerTarget === 'start') {
                setStartDate(d);
                if (d > endDate) setEndDate(d);
              } else {
                setEndDate(d);
              }
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.lg, gap: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.md },
  inputGroup: { gap: SPACING.xs },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: 16,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statusChip: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  statusChipText: { fontSize: 13, fontWeight: '600' },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  dateBtnIcon: { fontSize: 16 },
  dateBtnText: { color: COLORS.text, fontSize: 14, flex: 1 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, overflow: 'hidden' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerTitle: { fontFamily: FONTS.titleRegular, fontSize: 16, color: COLORS.text },
  pickerCancel: { color: COLORS.textMuted, fontSize: 15 },
  pickerConfirm: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
  submitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: COLORS.bg, fontWeight: '700', fontSize: 16 },
});
