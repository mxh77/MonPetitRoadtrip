import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING, STEP_TYPE } from '../theme';
import { useRoadtripStore } from '../store/roadtripStore';

const TYPES = Object.entries(STEP_TYPE); // [['DEPARTURE', {...}], ...]

function parseDate(str) {
  if (!str.trim()) return undefined;
  const parts = str.includes('/') ? str.split('/').reverse() : str.split('-');
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function formatDateDefault(date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CreateStepScreen({ route, navigation }) {
  const { roadtripId, stepCount = 0, startDate: rtStart } = route.params;

  const today = new Date();
  const defaultDate = rtStart ? new Date(rtStart) : today;
  defaultDate.setDate(defaultDate.getDate() + stepCount);

  const [name, setName] = useState('');
  const [type, setType] = useState('STAGE');
  const [startDate, setStartDate] = useState(formatDateDefault(defaultDate));
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const { createStep } = useRoadtripStore();

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Le nom de l\'étape est obligatoire.');
      return;
    }

    const parsedStart = startDate ? parseDate(startDate) : undefined;
    const parsedEnd = endDate ? parseDate(endDate) : undefined;

    if (parsedStart === null || parsedEnd === null) {
      Alert.alert('Date invalide', 'Format attendu : JJ/MM/AAAA');
      return;
    }

    setLoading(true);
    try {
      await createStep({
        roadtripId,
        type,
        name: name.trim(),
        location: location.trim() || null,
        startDate: parsedStart,
        endDate: parsedEnd,
        notes: notes.trim() || null,
        order: stepCount,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de créer l\'étape.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ─── Type ────────────────────────────────────────────────────────── */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.typePicker}>
            {TYPES.map(([key, cfg]) => (
              <TouchableOpacity
                key={key}
                style={[styles.typeBtn, type === key && styles.typeBtnActive]}
                onPress={() => setType(key)}
              >
                <Text style={styles.typeIcon}>{cfg.icon}</Text>
                <Text style={[styles.typeLabel, type === key && styles.typeLabelActive]}>
                  {cfg.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Name ────────────────────────────────────────────────────────── */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Paris, Lyon, Chamonix…"
            placeholderTextColor={COLORS.textDim}
            autoFocus
          />
        </View>

        {/* ─── Location ────────────────────────────────────────────────────── */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lieu (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Adresse ou ville…"
            placeholderTextColor={COLORS.textDim}
          />
        </View>

        {/* ─── Dates ───────────────────────────────────────────────────────── */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date de début</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numeric"
            />
          </View>
          <View style={{ width: SPACING.md }} />
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date de fin</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* ─── Notes ───────────────────────────────────────────────────────── */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Infos utiles, à ne pas oublier…"
            placeholderTextColor={COLORS.textDim}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* ─── Submit ──────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={COLORS.bg} />
            : <Text style={styles.btnText}>Ajouter l'étape</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xl * 2 },

  inputGroup: { marginBottom: SPACING.lg },
  row: { flexDirection: 'row', marginBottom: SPACING.lg },

  label: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    color: COLORS.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  typePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  typeBtnActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '22',
  },
  typeIcon: { fontSize: 16 },
  typeLabel: { fontSize: 13, color: COLORS.textDim, fontWeight: '600' },
  typeLabelActive: { color: COLORS.accent },

  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: COLORS.bg,
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    fontWeight: '700',
  },
});
