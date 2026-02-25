import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

  // defaultValue dans textInputProps n'est pas fiable — on force via ref
  useEffect(() => {
    if (initialValue && ref.current) {
      ref.current.setAddressText(initialValue);
    }
  }, [initialValue]);

  return (
    <View style={styles.group}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <GooglePlacesAutocomplete
        ref={ref}
        placeholder="Adresse ou lieu…"
        minLength={2}
        fetchDetails
        enablePoweredByContainer={false}
        language="fr"
        query={{
          key: API_KEY,
          language: 'fr',
          types: ['geocode', 'establishment'],
        }}
        textInputProps={{
          defaultValue: initialValue,
          placeholderTextColor: COLORS.textDim,
          selectionColor: COLORS.accent,
        }}
        onPress={(data, details = null) => {
          const location = data.description;
          const latitude = details?.geometry?.location?.lat ?? null;
          const longitude = details?.geometry?.location?.lng ?? null;
          onSelect?.({ location, latitude, longitude });
        }}
        onFail={(error) => console.warn('GooglePlaces onFail:', JSON.stringify(error))}
        styles={{
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
        flatListProps={{ scrollEnabled: false, nestedScrollEnabled: false }}
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
    height: 48,
    marginBottom: 0,
  },
  listView: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    zIndex: 10,
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
});
