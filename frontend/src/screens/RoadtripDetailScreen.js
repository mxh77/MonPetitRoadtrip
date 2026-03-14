import React, { useEffect, useLayoutEffect, useState, useRef, Component } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Pressable, Modal, StatusBar, Dimensions, Image,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme';
import { useRoadtripStore } from '../store/roadtripStore';
import { useRoadtrip } from '../hooks/usePowerSync';
import { useRoadtripRole } from '../hooks/useRoadtripRole';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = 80;
const CARD_GAP = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr, opts = { day: 'numeric', month: 'short' }) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('fr-FR', opts);
}
function durationDays(start, end) {
  if (!start || !end) return null;
  const d = Math.round((new Date(end) - new Date(start)) / 86400000);
  return d > 0 ? d : null;
}
function dayOffset(baseDate, targetDate) {
  if (!baseDate || !targetDate) return null;
  const d = Math.round((new Date(targetDate) - new Date(baseDate)) / 86400000);
  return d >= 0 ? d + 1 : null;
}
function getInitials(name) {
  const words = (name ?? '').trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
function computeRegion(pts) {
  if (!pts.length) return { latitude: 46.2276, longitude: 2.2137, latitudeDelta: 10, longitudeDelta: 10 };
  const lats = pts.map(s => parseFloat(s.latitude));
  const lngs = pts.map(s => parseFloat(s.longitude));
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + 1.0, 0.08),
    longitudeDelta: Math.max(maxLng - minLng + 1.0, 0.08),
  };
}

const STEP_COLORS = {
  DEPARTURE: '#2D6A4F',
  RETURN:    '#1D3557',
  STAGE:     '#1B4332',
  STOP:      '#4A1942',
};

// ─── MapErrorBoundary ────────────────────────────────────────────────────────

class MapErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e, i) { console.error('[Map]', e?.message, i?.componentStack); }
  render() {
    if (this.state.hasError) return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textMuted }}>La carte n'a pas pu se charger.</Text>
      </View>
    );
    return this.props.children;
  }
}

// ─── StepCard ─────────────────────────────────────────────────────────────────

function StepCard({ step, active, dayNum, onPress }) {
  const initials = getInitials(step.name);
  const bg = STEP_COLORS[step.type] ?? '#1B4332';
  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.8}>
      <View style={[styles.cardCircle, { backgroundColor: bg }, active && styles.cardCircleActive]}>
        {step.photoUrl ? (
          <Image source={{ uri: step.photoUrl }} style={styles.cardPhoto} resizeMode="cover" />
        ) : (
          <Text style={styles.cardInitials}>{initials}</Text>
        )}
      </View>
      {dayNum != null && (
        <Text style={[styles.cardDay, active && styles.cardDayActive]}>J{dayNum}</Text>
      )}
      <Text style={[styles.cardName, active && styles.cardNameActive]} numberOfLines={2}>
        {step.name}
      </Text>
    </TouchableOpacity>
  );
}

// ─── AddButton ────────────────────────────────────────────────────────────────

function AddButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.addBetween} activeOpacity={0.7}>
      <View style={styles.addBetweenLine} />
      <View style={styles.addBetweenCircle}>
        <Text style={styles.addBetweenPlus}>+</Text>
      </View>
      <View style={styles.addBetweenLine} />
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RoadtripDetailScreen({ route, navigation }) {
  const { id, roadtripData, userRole: routeUserRole } = route.params;
  const { deleteStep, deleteRoadtrip } = useRoadtripStore();
  const { roadtrip: syncedRoadtrip } = useRoadtrip(id);
  const { role, isOwner: roleIsOwner, canEdit: roleCanEdit, isLoading: roleLoading } = useRoadtripRole(id);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);
  const timelineRef = useRef(null);
  const mapRef = useRef(null);
  const { bottom, top } = useSafeAreaInsets();

  // Utiliser routeUserRole comme valeur initiale (optimistic), puis role quand chargé.
  // En cas d'incertitude, on utilise VIEWER pour éviter d'afficher des actions non autorisées.
  const effectiveRole = role ?? routeUserRole ?? 'VIEWER';
  const effectiveCanEdit = effectiveRole === 'OWNER' || effectiveRole === 'EDITOR';
  const effectiveIsOwner = effectiveRole === 'OWNER';

  const rt = syncedRoadtrip ?? (roadtripData ? { ...roadtripData, steps: [] } : null);

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  const steps = rt?.steps ?? [];
  const selectedStep = steps[selectedStepIdx] ?? null;
  const stepsWithCoords = steps.filter(s => s.latitude != null && s.longitude != null && !isNaN(parseFloat(s.latitude)) && !isNaN(parseFloat(s.longitude)));

  // Centrer la carte sur l'étape sélectionnée
  useEffect(() => {
    if (!selectedStep?.latitude || !mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: parseFloat(selectedStep.latitude),
      longitude: parseFloat(selectedStep.longitude),
      latitudeDelta: 0.5,
      longitudeDelta: 0.5,
    }, 400);
  }, [selectedStepIdx]);

  // Scroll timeline vers la carte active
  useEffect(() => {
    if (!timelineRef.current) return;
    const itemW = CARD_W + CARD_GAP + 40; // card + addBtn
    const offset = selectedStepIdx * itemW - SCREEN_W / 2 + CARD_W / 2 + 16;
    timelineRef.current.scrollTo({ x: Math.max(0, offset), animated: true });
  }, [selectedStepIdx]);

  const handleDeleteRoadtrip = () => {
    setMenuVisible(false);
    Alert.alert('Supprimer ce roadtrip ?', `« ${rt?.title} » sera définitivement supprimé.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await deleteRoadtrip(id); navigation.goBack(); }
        catch { Alert.alert('Erreur', 'Impossible de supprimer.'); }
      }},
    ]);
  };

  if (!rt) {
    return <View style={styles.loader}><ActivityIndicator color={COLORS.accent} size="large" /></View>;
  }

  const dur = durationDays(rt.startDate, rt.endDate);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── Carte plein écran ──────────────────────────────────────── */}
      <MapErrorBoundary>
        <MapView
          ref={mapRef}
          style={{ position: 'absolute', top, left: 0, right: 0, bottom }}
          initialRegion={computeRegion(stepsWithCoords)}
          showsUserLocation={false}
          showsCompass={false}
          showsMyLocationButton={false}
        >
          {stepsWithCoords.length >= 2 && (
            <Polyline
              coordinates={stepsWithCoords.map(s => ({ latitude: parseFloat(s.latitude), longitude: parseFloat(s.longitude) }))}
              strokeColor={COLORS.accent}
              strokeWidth={3}
              lineDashPattern={[12, 6]}
            />
          )}
          {stepsWithCoords.map((step, idx) => {
            const isSelected = step.id === selectedStep?.id;
            const stepIdx = steps.indexOf(step);
            return (
              <Marker
                key={step.id}
                coordinate={{ latitude: parseFloat(step.latitude), longitude: parseFloat(step.longitude) }}
                onPress={() => setSelectedStepIdx(stepIdx)}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={isSelected}
              >
                <View style={[styles.marker, isSelected && styles.markerSelected]}>
                  <Text style={[styles.markerText, isSelected && styles.markerTextSelected]} numberOfLines={1}>
                    {getInitials(step.name)}
                  </Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
      </MapErrorBoundary>

      {/* ─── Header overlay ────────────────────────────────────────── */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
        <View style={[styles.headerRow, { marginTop: 20 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerBtnText}>‹</Text>
          </TouchableOpacity>

          {/* Spacer pour pousser les boutons à droite */}
          <View style={{ flex: 1 }} />

          {/* Titre centré absolument */}
          <View style={styles.headerCenter} pointerEvents="none">
            <Text style={styles.headerTitle} numberOfLines={1}>{rt.title}</Text>
            {(dur || rt.startDate) ? (
              <Text style={styles.headerSub}>
                {rt.startDate ? `${formatDate(rt.startDate)} – ${formatDate(rt.endDate) ?? '?'}` : ''}
                {dur ? `  ·  ${dur}j` : ''}
                {'  ·  '}{steps.length} étape{steps.length > 1 ? 's' : ''}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Collaborators', { roadtripId: id })}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.headerBtnText}>👥</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerBtnText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ─── Step info panel ───────────────────────────────────────── */}
      {selectedStep && (
        <TouchableOpacity
          style={[styles.infoPanel, { bottom: 170 + Math.max(bottom, 12) }]}
          onPress={() => {
            if (effectiveCanEdit) {
              navigation.navigate('EditStep', { step: selectedStep });
            }
          }}
          activeOpacity={effectiveCanEdit ? 0.85 : 1}
        >
          <View style={styles.infoPanelInner}>
            <View style={{ flex: 1 }}>
              {(selectedStep.startDate || selectedStep.endDate) && (
                <View style={styles.infoPanelDates}>
                  <Text style={styles.infoPanelDatesText}>
                    {selectedStep.startDate ? `🛬 ${formatDate(selectedStep.startDate)}${selectedStep.arrivalTime ? ` · ${selectedStep.arrivalTime}` : ''}` : ''}
                  </Text>
                  <Text style={styles.infoPanelDatesText}>
                    {selectedStep.endDate ? `🛫 ${formatDate(selectedStep.endDate)}${selectedStep.departureTime ? ` · ${selectedStep.departureTime}` : ''}` : ''}
                  </Text>
                </View>
              )}
              <Text style={styles.infoPanelName} numberOfLines={1}>{selectedStep.name}</Text>
              {selectedStep.location && (
                <Text style={styles.infoPanelMeta} numberOfLines={1}>📍 {selectedStep.location}</Text>
              )}
              {Array.isArray(selectedStep.activities) && (<>
                <Text style={styles.infoPanelCounts}>
                  {`🏨 ${selectedStep.accommodation ? 1 : 0} hébergement`}
                </Text>
                <Text style={styles.infoPanelCounts}>
                  {`🎯 ${selectedStep.activities.length} activité${selectedStep.activities.length > 1 ? 's' : ''}`}
                </Text>
              </>)}
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* ─── Timeline Polarsteps ───────────────────────────────────── */}
      <View style={[styles.timelineContainer, { paddingBottom: Math.max(bottom, 12) }]}>
        <ScrollView
          ref={timelineRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timelineContent}
        >
          {steps.map((step, idx) => (
            <View key={step.id} style={styles.timelineRow}>
              <StepCard
                step={step}
                active={idx === selectedStepIdx}
                dayNum={dayOffset(rt.startDate, step.startDate)}
                onPress={() => setSelectedStepIdx(idx)}
              />
              {effectiveCanEdit && (
                <AddButton
                  onPress={() => navigation.navigate('CreateStep', {
                    roadtripId: rt.id,
                    stepCount: steps.length,
                    insertAfterIdx: idx,
                    startDate: rt.startDate,
                  })}
                />
              )}
            </View>
          ))}

          {/* Bouton "+" final pour ajouter une étape à la fin */}
          {effectiveCanEdit && (
            <TouchableOpacity
              style={styles.cardAddNew}
              onPress={() => navigation.navigate('CreateStep', {
                roadtripId: rt.id,
                stepCount: steps.length,
                startDate: rt.startDate,
              })}
              activeOpacity={0.8}
            >
              <View style={styles.cardAddNewCircle}>
                <Text style={styles.cardAddNewPlus}>+</Text>
              </View>
              <Text style={styles.cardAddNewLabel}>Ajouter</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* ─── Menu ⋯ ────────────────────────────────────────────────── */}
      <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={[styles.menuSheet, { paddingBottom: Math.max(bottom, 16) }]} onPress={() => {}}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle}>Options</Text>
            <View style={styles.menuDivider} />
            {effectiveIsOwner ? (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('EditRoadtrip', { roadtrip: rt }); }}>
                  <Text style={styles.menuItemIcon}>✏️</Text>
                  <Text style={styles.menuItemLabel}>Modifier le roadtrip</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleDeleteRoadtrip}>
                  <Text style={styles.menuItemIconDanger}>🗑</Text>
                  <Text style={styles.menuItemLabelDanger}>Supprimer ce roadtrip</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.menuItem}>
                <Text style={styles.menuItemIcon}>🔒</Text>
                <Text style={[styles.menuItemLabel, { color: COLORS.textMuted }]}>Seul l'organisateur peut modifier</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D1F14' },
  loader: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },

  // Header
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.md, gap: SPACING.sm, position: 'relative' },
  headerBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 6,
  },
  headerBtnText: { color: '#000', fontSize: 26, fontWeight: '600', lineHeight: 30, includeFontPadding: false, textAlignVertical: 'center' },
  headerCenter: {
    position: 'absolute', left: 58, right: 58,
    backgroundColor: 'rgba(0,0,0,1)',
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 6,
    alignItems: 'center',
  },
  headerTitle: { fontFamily: FONTS.title, fontSize: 20, color: '#fff', fontWeight: '700' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,1)', marginTop: 2 },

  // Info panel
  infoPanel: { position: 'absolute', left: SPACING.md, right: SPACING.md, zIndex: 10 },
  infoPanelInner: {
    backgroundColor: 'rgba(13,31,20,0.92)',
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  infoPanelName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  infoPanelMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  infoPanelDates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 2 },
  infoPanelDatesText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  infoPanelCounts: { color: COLORS.accent, fontSize: 11, marginTop: 3, fontWeight: '600' },
  infoPanelActions: { flexDirection: 'row', gap: 8 },
  infoPanelBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  infoPanelBtnText: { fontSize: 15 },

  // Timeline
  timelineContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,22,14,0.88)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: SPACING.md,
  },
  timelineContent: { paddingHorizontal: SPACING.md, alignItems: 'center', paddingBottom: 4 },
  timelineRow: { flexDirection: 'row', alignItems: 'center' },

  // Step card
  card: { width: CARD_W, alignItems: 'center' },
  cardCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  cardCircleActive: {
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6,
  },
  cardInitials: { fontFamily: FONTS.title, fontSize: 17, color: '#fff' },
  cardPhoto: { width: '100%', height: '100%', borderRadius: 24 },
  cardDay: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: 5, letterSpacing: 0.5 },
  cardDayActive: { color: COLORS.accent },
  cardName: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2, lineHeight: 13 },
  cardNameActive: { color: '#fff', fontWeight: '600' },

  // Add between
  addBetween: { flexDirection: 'row', alignItems: 'center', width: 40 },
  addBetweenLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  addBetweenCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  addBetweenPlus: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 18 },

  // Add new (fin de timeline)
  cardAddNew: { width: CARD_W, alignItems: 'center', marginLeft: 4 },
  cardAddNewCircle: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: COLORS.accent,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(52,168,83,0.08)',
  },
  cardAddNewPlus: { color: COLORS.accent, fontSize: 26, fontWeight: '300', lineHeight: 30 },
  cardAddNewLabel: { fontSize: 10, color: COLORS.accent, marginTop: 5 },

  // Markers
  marker: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1B4332',
    borderWidth: 2.5, borderColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 5,
  },
  markerSelected: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.accent, borderColor: '#fff' },
  markerText: { fontFamily: FONTS.title, fontSize: 13, color: '#fff', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  markerTextSelected: { fontSize: 15 },

  // Menu modal
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  menuSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  menuHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SPACING.md },
  menuTitle: { fontFamily: FONTS.title, fontSize: 22, color: COLORS.text, marginBottom: SPACING.md },
  menuDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  menuItemIcon: { fontSize: 20 },
  menuItemLabel: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  menuItemIconDanger: { fontSize: 20 },
  menuItemLabelDanger: { fontSize: 16, color: COLORS.error, fontWeight: '600' },
});