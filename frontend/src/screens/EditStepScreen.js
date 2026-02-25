import React, { useState, useLayoutEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING, STEP_TYPE } from '../theme';
import { useRoadtripStore } from '../store/roadtripStore';
import LocationPicker from '../components/LocationPicker';

const TYPES = Object.entries(STEP_TYPE);

function formatDisplay(d) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export default function EditStepScreen({ route, navigation }) {
  const { step } = route.params;

  const [name, setName] = useState(step.name ?? '');
  const [type, setType] = useState(step.type ?? 'STAGE');
  const [startDate, setStartDate] = useState(parseDate(step.startDate) ?? new Date());
  const [endDate, setEndDate] = useState(parseDate(step.endDate));
  const [location, setLocation] = useState(step.location ?? '');
  const [latitude, setLatitude] = useState(step.latitude ?? null);
  const [longitude, setLongitude] = useState(step.longitude ?? null);
  const [notes, setNotes] = useState(step.notes ?? '');
  const [loading, setLoading] = useState(false);

  // Picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [pickerTemp, setPickerTemp] = useState(new Date());

  const { updateStep } = useRoadtripStore();

  const openPicker = (target) => {
    setPickerTarget(target);
    setPickerTemp(target === 'start' ? startDate : (endDate ?? startDate));
    setPickerVisible(true);
  };

  const confirmPicker = () => {
    if (pickerTarget === 'start') {
      setStartDate(pickerTemp);
      if (endDate && pickerTemp > endDate) setEndDate(pickerTemp);
    } else {
      setEndDate(pickerTemp);
    }
    setPickerVisible(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Champ requis', "Le nom de l'étape est obligatoire.");
      return;
    }
    setLoading(true);
    try {
      await updateStep(step.id, {
        type,
        name: name.trim(),
        location: location.trim() || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : null,
        notes: notes.trim() || null,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', "Impossible de modifier l'étape.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRef = useRef();
  handleSubmitRef.current = handleSubmit;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => loading
        ? <ActivityIndicator color={COLORS.accent} style={{ marginRight: SPACING.md }} />
        : (
          <TouchableOpacity onPress={() => handleSubmitRef.current()} style={{ marginRight: SPACING.md }}>
            <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 16 }}>Enregistrer</Text>
          </TouchableOpacity>
        ),
    });
  }, [navigation, loading]);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">

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

        {/* ─── Nom ─────────────────────────────────────────────────────────── */}
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

        {/* ─── Lieu ────────────────────────────────────────────────────────── */}
        <LocationPicker
          initialValue={location}
          onSelect={({ location: loc, latitude: lat, longitude: lng }) => {
            setLocation(loc);
            setLatitude(lat);
            setLongitude(lng);
          }}
        />

        {/* ─── Dates ───────────────────────────────────────────────────────── */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date de début</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('start')}>
              <Text style={styles.dateBtnIcon}>📅</Text>
              <Text style={styles.dateBtnText}>{formatDisplay(startDate)}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ width: SPACING.md }} />
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date de fin</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('end')}>
              <Text style={styles.dateBtnIcon}>📅</Text>
              <Text style={[styles.dateBtnText, !endDate && { color: COLORS.textDim }]}>
                {endDate ? formatDisplay(endDate) : 'Non définie'}
              </Text>
            </TouchableOpacity>
            {endDate && (
              <TouchableOpacity onPress={() => setEndDate(null)} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕ effacer</Text>
              </TouchableOpacity>
            )}
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
                  {pickerTarget === 'start' ? 'Date de début' : 'Date de fin'}
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

      {/* Android : picker direct */}
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
                if (endDate && d > endDate) setEndDate(d);
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
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  dateBtnIcon: { fontSize: 15 },
  dateBtnText: { color: COLORS.text, fontSize: 14, flex: 1 },
  clearBtn: { marginTop: 4, alignSelf: 'flex-start' },
  clearBtnText: { color: COLORS.textDim, fontSize: 12 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, overflow: 'hidden' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerTitle: { fontFamily: FONTS.titleRegular, fontSize: 16, color: COLORS.text },
  pickerCancel: { color: COLORS.textDim, fontSize: 15 },
  pickerConfirm: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
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
  typeBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '22' },
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
  btnText: { color: COLORS.bg, fontFamily: FONTS.bodyBold, fontSize: 15, fontWeight: '700' },
});
