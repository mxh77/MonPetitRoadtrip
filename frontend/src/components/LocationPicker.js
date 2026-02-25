import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { COLORS, RADIUS, SPACING } from '../theme';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

/**
 * Champ d'autocomplétion Google Places.
 *
 * Props :
 *   - label        : string (label affiché au-dessus)
 *   - initialValue : string (valeur pré-remplie, ex: en mode édition)
 *   - onSelect     : ({ location, latitude, longitude }) => void
 */
export default function LocationPicker({ label = 'Lieu (optionnel)', initialValue = '', onSelect }) {
  const ref = useRef(null);
  const [hasText, setHasText] = useState(!!initialValue);
  const [instanceKey, setInstanceKey] = useState(0);

  // Pré-remplir le champ texte au montage (defaultValue ignoré car TextInput est contrôlé par la lib)
  useEffect(() => {
    if (initialValue) {
      ref.current?.setAddressText(initialValue);
    }
  }, [instanceKey]); // re-run si remontage (après clear)

  const handleClear = () => {
    setHasText(false);
    setInstanceKey(k => k + 1); // remonte le composant → vide tout l'état interne
    onSelect?.({ location: '', latitude: null, longitude: null });
  };

  return (
    <View style={styles.group}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <GooglePlacesAutocomplete
        key={instanceKey}
        ref={ref}
        placeholder="Adresse ou lieu…"
        minLength={2}
        fetchDetails
        enablePoweredByContainer={false}
        language="fr"
        query={{
          key: API_KEY,
          language: 'fr',
        }}
        textInputProps={{
          defaultValue: initialValue,
          placeholderTextColor: COLORS.textDim,
          selectionColor: COLORS.accent,
          onChangeText: (t) => setHasText(t.length > 0),
        }}
        onPress={(data, details = null) => {
          setHasText(true);
          const location = data.description;
          const latitude = details?.geometry?.location?.lat ?? null;
          const longitude = details?.geometry?.location?.lng ?? null;
          onSelect?.({ location, latitude, longitude });
        }}
        renderRightButton={() =>
          hasText ? (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null
        }
        styles={{
          container: { flex: 0 },
          textInputContainer: styles.inputContainer,
          textInput: styles.input,
          listView: styles.listView,
          row: styles.row,
          description: styles.description,
          separator: styles.separator,
          poweredContainer: { display: 'none' },
        }}
        listViewDisplayed="auto"
        keepResultsAfterBlur={false}
        debounce={300}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.text,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    paddingHorizontal: SPACING.md,
    paddingRight: 40,
    height: 48,
    marginBottom: 0,
  },
  listView: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  row: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  description: {
    color: COLORS.text,
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  clearBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: COLORS.textDim,
    fontSize: 16,
  },
});
