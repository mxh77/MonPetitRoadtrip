import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity,
  Image, ActivityIndicator, FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  COLORS, FONTS, RADIUS, SPACING, STEP_TYPE, BOOKING_STATUS,
} from '../theme';
import { useRoadtripStore } from '../store/roadtripStore';
import { useStep, useStepPhotos } from '../hooks/usePowerSync';
import { useAuthStore } from '../store/authStore';
import { localDeletePhoto } from '../powersync/localWrite';
import API_URL from '../api/config';

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
  const { deleteActivity } = useRoadtripStore();
  const { step } = useStep(stepId);
  const { photos: syncedPhotos } = useStepPhotos(stepId);
  const token = useAuthStore((s) => s.token);
  const [uploading, setUploading] = useState(false);
  // Photos uploadées mais pas encore syncées par PowerSync — affichage immédiat
  const [optimisticPhotos, setOptimisticPhotos] = useState([]);

  // Fusion : photos PowerSync + optimistes (dédupliquer par id)
  const photos = [
    ...syncedPhotos,
    ...optimisticPhotos.filter((op) => !syncedPhotos.find((sp) => sp.id === op.id)),
  ];

  // Nettoyer les optimistes quand PowerSync les a syncés
  useEffect(() => {
    if (optimisticPhotos.length === 0) return;
    setOptimisticPhotos((prev) => prev.filter((op) => !syncedPhotos.find((sp) => sp.id === op.id)));
  }, [syncedPhotos]);

  useEffect(() => {
    if (step?.name) {
      navigation.setOptions({ title: step.name });
    }
  }, [step?.name]);

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "L'accès à la galerie est requis pour ajouter des photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('photo', {
      uri: asset.uri,
      name: asset.fileName || `photo_${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    });
    formData.append('stepId', stepId);

    setUploading(true);
    try {
      const res = await fetch(`${API_URL}/api/photos/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`HTTP ${res.status}: ${errBody}`);
      }
      const uploaded = await res.json();
      // Affichage immédiat — PowerSync synchro la copie serveur en arrière-plan
      setOptimisticPhotos((prev) => [...prev, uploaded]);
    } catch (err) {
      console.error('[PHOTO UPLOAD]', err.message);
      Alert.alert('Erreur upload', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = (photo) => {
    Alert.alert('Supprimer cette photo ?', null, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          // Suppression locale immédiate (PowerSync queue → backend quand réseau dispo)
          await localDeletePhoto(photo.id);
          // Nettoyer aussi les optimistes
          setOptimisticPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        },
      },
    ]);
  };

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

        {/* ─── Photos ─────────────────────────────────────────────────────── */}
        <SectionCard title={`Photos (${photos.length})`}>
          {photos.length > 0 ? (
            <FlatList
              data={photos}
              keyExtractor={(p) => p.id}
              numColumns={3}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.photoThumb}
                  onLongPress={() => handleDeletePhoto(item)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item.url }} style={styles.photoImage} />
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={[styles.photoAdd, uploading && styles.photoAddDisabled]}
                  onPress={uploading ? null : handleAddPhoto}
                  activeOpacity={0.7}
                >
                  {uploading
                    ? <ActivityIndicator color={COLORS.textMuted} />
                    : <Text style={styles.photoAddIcon}>+</Text>}
                </TouchableOpacity>
              }
            />
          ) : (
            <View style={styles.photosEmpty}>
              <Text style={styles.emptyText}>Aucune photo pour cette étape.</Text>
              <TouchableOpacity
                style={[styles.photoAddLarge, uploading && styles.photoAddDisabled]}
                onPress={uploading ? null : handleAddPhoto}
                activeOpacity={0.7}
              >
                {uploading
                  ? <ActivityIndicator color={COLORS.textMuted} />
                  : <Text style={styles.photoAddIcon}>+ Ajouter une photo</Text>}
              </TouchableOpacity>
            </View>
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
  photosEmpty: { alignItems: 'center', gap: SPACING.sm },
  photoThumb: {
    width: (Dimensions.get('window').width - SPACING.lg * 2 - SPACING.md * 2 - 6) / 3,
    aspectRatio: 1,
    margin: 1,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.border,
  },
  photoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoAdd: {
    width: (Dimensions.get('window').width - SPACING.lg * 2 - SPACING.md * 2 - 6) / 3,
    aspectRatio: 1,
    margin: 1,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    borderStyle: 'dashed',
  },
  photoAddLarge: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    borderStyle: 'dashed',
  },
  photoAddDisabled: { opacity: 0.4 },
  photoAddIcon: { color: COLORS.textMuted, fontSize: 22, fontWeight: '300' },
});
