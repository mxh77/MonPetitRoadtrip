import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING, ROADTRIP_STATUS, STEP_TYPE } from '../theme';
import { useRoadtripStore } from '../store/roadtripStore';
import { useRoadtrip } from '../hooks/usePowerSync';

function StepCard({ step, onPress, onDelete }) {
  const typeCfg = STEP_TYPE[step.type] || STEP_TYPE.STAGE;
  const dateText = step.startDate
    ? new Date(step.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : null;

  const handleLongPress = () => {
    Alert.alert(
      'Supprimer cette étape ?',
      `"${step.name}" sera définitivement supprimée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.stepCard}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      <View style={styles.stepIconWrap}>
        <Text style={styles.stepIcon}>{typeCfg.icon}</Text>
      </View>
      <View style={styles.stepInfo}>
        <Text style={styles.stepType}>{typeCfg.label}</Text>
        <Text style={styles.stepName} numberOfLines={1}>{step.name}</Text>
        {(step.location || dateText) && (
          <Text style={styles.stepMeta}>
            {[step.location, dateText].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
      <Text style={styles.stepArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function RoadtripDetailScreen({ route, navigation }) {
  const { id, roadtripData } = route.params;
  const { deleteStep } = useRoadtripStore();
  const { roadtrip: syncedRoadtrip } = useRoadtrip(id);
  // Utilise les données passées par navigation en fallback le temps que PowerSync synce
  const currentRoadtrip = syncedRoadtrip ?? (roadtripData ? { ...roadtripData, steps: [] } : null);

  useEffect(() => {
    if (currentRoadtrip?.title) {
      navigation.setOptions({ title: currentRoadtrip.title });
    }
  }, [currentRoadtrip?.title]);

  const handleDeleteStep = useCallback(async (stepId) => {
    try {
      await deleteStep(stepId);
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer cette étape.');
    }
  }, [deleteStep]);

  if (!currentRoadtrip) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  const statusCfg = ROADTRIP_STATUS[currentRoadtrip.status] || ROADTRIP_STATUS.DRAFT;

  const renderHeader = () => (
    <View style={styles.headerCard}>
      {/* Status + dates */}
      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.badgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
        {currentRoadtrip.startDate && (
          <Text style={styles.dateText}>
            {new Date(currentRoadtrip.startDate).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
            {currentRoadtrip.endDate && (
              ` → ${new Date(currentRoadtrip.endDate).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}`
            )}
          </Text>
        )}
      </View>

      {/* Section title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Étapes <Text style={styles.sectionTitleAccent}>({currentRoadtrip.steps?.length || 0})</Text>
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <FlatList
        data={currentRoadtrip.steps || []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <StepCard
            step={item}
            onPress={() =>
              navigation.navigate('StepDetail', { stepId: item.id, stepName: item.name })
            }
            onDelete={() => handleDeleteStep(item.id)}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyText}>Aucune étape pour l'instant.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loader: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.textMuted, fontSize: 15 },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  headerCard: { marginBottom: SPACING.lg },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  badge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateText: { color: COLORS.textMuted, fontSize: 13 },
  sectionHeader: { borderTopWidth: 1, borderColor: COLORS.border, paddingTop: SPACING.md },
  sectionTitle: { fontFamily: FONTS.title, fontSize: 22, color: COLORS.text },
  sectionTitleAccent: { fontFamily: FONTS.titleItalic, color: COLORS.accent },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  stepIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: { fontSize: 20 },
  stepInfo: { flex: 1 },
  stepType: {
    color: COLORS.textDim,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 2,
  },
  stepName: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  stepMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  stepArrow: { color: COLORS.textMuted, fontSize: 22, fontWeight: '300' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
