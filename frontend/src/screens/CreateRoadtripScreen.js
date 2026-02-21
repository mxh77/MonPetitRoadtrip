import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING, ROADTRIP_STATUS } from '../theme';
import { useRoadtripStore } from '../store/roadtripStore';

const STATUSES = ['DRAFT', 'PLANNED', 'ONGOING', 'COMPLETED'];

export default function CreateRoadtripScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [loading, setLoading] = useState(false);

  const { createRoadtrip } = useRoadtripStore();

  const parseDate = (str) => {
    if (!str.trim()) return undefined;
    // Accepts DD/MM/YYYY or YYYY-MM-DD
    const parts = str.includes('/') ? str.split('/').reverse() : str.split('-');
    const d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Champ requis', 'Le titre est obligatoire.');
      return;
    }

    const parsedStart = startDate ? parseDate(startDate) : undefined;
    const parsedEnd = endDate ? parseDate(endDate) : undefined;

    if (parsedStart === null || parsedEnd === null) {
      Alert.alert('Date invalide', 'Format attendu : JJ/MM/AAAA ou AAAA-MM-JJ');
      return;
    }

    setLoading(true);
    try {
      const roadtrip = await createRoadtrip({
        title: title.trim(),
        startDate: parsedStart,
        endDate: parsedEnd,
        status,
      });
      navigation.replace('RoadtripDetail', { id: roadtrip.id, title: roadtrip.title });
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
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor={COLORS.textDim}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Retour</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor={COLORS.textDim}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            />
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
