import React, { useState, useLayoutEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING, STEP_TYPE } from '../theme';
import { useRoadtripStore } from '../store/roadtripStore';
import LocationPicker from '../components/LocationPicker';
import DateTimePickerModal from '../components/DateTimePickerModal';

const TYPES = Object.entries(STEP_TYPE); // [['DEPARTURE', {...}], ...]

const toLocalDateString = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fromLocalDate = (str) => {
  if (!str) return new Date();
  const [y, mo, d] = str.slice(0, 10).split('-').map(Number);
  return new Date(y, mo - 1, d, 12, 0, 0);
};

const fmtBtn = (date, time) => {
  const d = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  return time ? `${d}  ·  ${time}` : d;
};

export default function CreateStepScreen({ route, navigation }) {
  const { roadtripId, stepCount = 0, startDate: rtStart } = route.params;

  const base = fromLocalDate(rtStart);
  const defaultDate = new Date(base.getFullYear(), base.getMonth(), base.getDate() + stepCount, 12, 0, 0);

  const [name, setName] = useState('');
  const [type, setType] = useState('STAGE');
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(null); // null = non définie
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [notes, setNotes] = useState('');
  const [arrivalTime, setArrivalTime] = useState(null);
  const [departureTime, setDepartureTime] = useState(null);
  const [loading, setLoading] = useState(false);

  // DateTime picker
  const [dtPickerVisible, setDtPickerVisible] = useState(false);
  const [dtPickerTarget, setDtPickerTarget] = useState(null); // 'start' | 'end'

  const { createStep } = useRoadtripStore();

  const handleSubmitRef = useRef();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => loading
        ? <ActivityIndicator color={COLORS.accent} style={{ marginRight: SPACING.md }} />
        : (
          <TouchableOpacity onPress={() => handleSubmitRef.current()} style={{ marginRight: SPACING.md }}>
            <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 16 }}>Ajouter</Text>
          </TouchableOpacity>
        ),
    });
  }, [navigation, loading]);

  const openDtPicker = (target) => {
    setDtPickerTarget(target);
    setDtPickerVisible(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Le nom de l\'étape est obligatoire.');
      return;
    }

    setLoading(true);
    try {
      await createStep({
        roadtripId,
        type,
        name: name.trim(),
        location: location.trim() || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        startDate: toLocalDateString(startDate),
        endDate: endDate ? toLocalDateString(endDate) : null,
        arrivalTime: arrivalTime ?? null,
        departureTime: departureTime ?? null,
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
  handleSubmitRef.current = handleSubmit;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>

      {/* ─── En-tête fixe (hors ScrollView pour éviter FlatList imbriquée) ────────── */}
      <View style={styles.header}>

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
          />
        </View>

      </View>

      {/* ─── Location (hors du header View pour éviter le clipping Android) ── */}
      <View style={styles.locationWrapper}>
        <LocationPicker
          initialValue={location}
          onSelect={({ location: loc, latitude: lat, longitude: lng }) => {
            setLocation(loc);
            setLatitude(lat);
            setLongitude(lng);
          }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">

        {/* ─── Arrivée / Départ ────────────────────────────────────────────── */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Arrivée</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => openDtPicker('start')}>
              <Text style={styles.dateBtnText}>{fmtBtn(startDate, arrivalTime)}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ width: SPACING.md }} />
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Départ</Text>
            <TouchableOpacity
              style={[styles.dateBtn, !endDate && styles.dateBtnEmpty]}
              onPress={() => openDtPicker('end')}
            >
              <Text style={[styles.dateBtnText, !endDate && { color: COLORS.textDim }]}>
                {endDate ? fmtBtn(endDate, departureTime) : '+ Ajouter'}
              </Text>
            </TouchableOpacity>
            {endDate && (
              <TouchableOpacity onPress={() => { setEndDate(null); setDepartureTime(null); }} style={styles.clearBtn}>
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

      <DateTimePickerModal
        visible={dtPickerVisible}
        date={dtPickerTarget === 'start' ? startDate : (endDate ?? startDate)}
        time={dtPickerTarget === 'start' ? arrivalTime : departureTime}
        label={dtPickerTarget === 'start' ? "Arrivée" : 'Départ'}
        minDate={dtPickerTarget === 'end' ? startDate : null}
        onConfirm={({ date, time }) => {
          if (dtPickerTarget === 'start') {
            setStartDate(date);
            setArrivalTime(time);
            if (endDate && date > endDate) setEndDate(date);
          } else {
            setEndDate(date);
            setDepartureTime(time);
          }
          setDtPickerVisible(false);
        }}
        onCancel={() => setDtPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  locationWrapper: { paddingHorizontal: SPACING.lg },
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: 48,
  },
  dateBtnEmpty: { borderStyle: 'dashed' },
  dateBtnText: { color: COLORS.text, fontSize: 14, textAlign: 'center' },
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
