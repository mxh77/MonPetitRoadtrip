import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORS, FONTS, RADIUS, SPACING, STEP_TYPE, BOOKING_STATUS,
} from '../theme';
import { useRoadtripStore } from '../store/roadtripStore';

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ActivityItem({ activity, onDelete }) {
  const statusCfg = BOOKING_STATUS[activity.status] || BOOKING_STATUS.PLANNED;
  return (
    <TouchableOpacity
      style={styles.activityItem}
      onLongPress={() =>
        Alert.alert('Supprimer ?', `"${activity.name}"`, [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: onDelete },
        ])
      }
      activeOpacity={0.8}
    >
      <View style={styles.activityLeft}>
        <Text style={styles.activityName} numberOfLines={1}>{activity.name}</Text>
        {activity.location && (
          <Text style={styles.activityMeta}>📍 {activity.location}</Text>
        )}
        {activity.cost != null && (
          <Text style={styles.activityMeta}>
            💶 {activity.cost} {activity.currency}
          </Text>
        )}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: `${statusCfg.color}20` }]}>
        <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function StepDetailScreen({ route, navigation }) {
  const { stepId } = route.params;
  const { currentRoadtrip, deleteActivity } = useRoadtripStore();

  const step = currentRoadtrip?.steps?.find((s) => s.id === stepId);

  useEffect(() => {
    if (step?.name) {
      navigation.setOptions({ title: step.name });
    }
  }, [step?.name]);

  if (!step) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>Étape introuvable.</Text>
      </View>
    );
  }

  const typeCfg = STEP_TYPE[step.type] || STEP_TYPE.STAGE;

  const formatDate = (iso, withTime = false) => {
    if (!iso) return null;
    const d = new Date(iso);
    return withTime
      ? d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ─── Step Header ────────────────────────────────────────────────── */}
        <View style={styles.stepHeader}>
          <Text style={styles.stepTypeLabel}>{typeCfg.icon} {typeCfg.label}</Text>
          <Text style={styles.stepName}>{step.name}</Text>
        </View>

        {/* ─── Info ───────────────────────────────────────────────────────── */}
        <SectionCard title="Informations">
          <InfoRow icon="📍" label="Lieu" value={step.location} />
          <InfoRow icon="📅" label="Début" value={formatDate(step.startDate)} />
          <InfoRow icon="📅" label="Fin" value={formatDate(step.endDate)} />
          <InfoRow icon="✈️" label="Arrivée" value={step.arrivalTime} />
          <InfoRow icon="🛫" label="Départ" value={step.departureTime} />
          <InfoRow icon="📝" label="Notes" value={step.notes} />
        </SectionCard>

        {/* ─── Accommodation ──────────────────────────────────────────────── */}
        {step.accommodation && (
          <SectionCard title="Hébergement">
            <InfoRow icon="🏨" label="Nom" value={step.accommodation.name} />
            <InfoRow icon="📍" label="Adresse" value={step.accommodation.address} />
            <InfoRow icon="📅" label="Check-in" value={formatDate(step.accommodation.checkIn, true)} />
            <InfoRow icon="📅" label="Check-out" value={formatDate(step.accommodation.checkOut, true)} />
            <InfoRow icon="🔖" label="Réf. réservation" value={step.accommodation.bookingRef} />
            {step.accommodation.pricePerNight != null && (
              <InfoRow
                icon="💶"
                label="Prix / nuit"
                value={`${step.accommodation.pricePerNight} ${step.accommodation.currency}`}
              />
            )}
            {step.accommodation.bookingUrl && (
              <InfoRow icon="🔗" label="Lien" value={step.accommodation.bookingUrl} />
            )}
          </SectionCard>
        )}

        {/* ─── Activities ─────────────────────────────────────────────────── */}
        <SectionCard title={`Activités (${step.activities?.length || 0})`}>
          {step.activities?.length > 0 ? (
            step.activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onDelete={async () => {
                  try {
                    await deleteActivity(activity.id, step.id);
                  } catch {
                    Alert.alert('Erreur', 'Impossible de supprimer cette activité.');
                  }
                }}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>Aucune activité pour cette étape.</Text>
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loader: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.textMuted, fontSize: 15 },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 40 },
  stepHeader: { marginBottom: SPACING.sm },
  stepTypeLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  stepName: {
    fontFamily: FONTS.title,
    fontSize: 32,
    color: COLORS.text,
    lineHeight: 38,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.titleRegular,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
  },
  infoRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  infoIcon: { fontSize: 16, marginTop: 1 },
  infoContent: { flex: 1 },
  infoLabel: {
    color: COLORS.textDim,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  infoValue: { color: COLORS.text, fontSize: 14, marginTop: 1 },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityLeft: { flex: 1, marginRight: SPACING.sm },
  activityName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  activityMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  statusBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: SPACING.sm },
});
