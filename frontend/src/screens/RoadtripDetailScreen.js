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
const CARD_W    = Math.floor(SCREEN_W * 0.75);
const CARD_H    = 120;
const CARD_GAP  = 20;
const SNAP_W    = CARD_W + CARD_GAP;
const SIDE_PAD  = Math.floor((SCREEN_W - CARD_W) / 2);
const TIMELINE_H = CARD_H + 36;

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
  STAGE: '#1B4332',
  STOP:  '#4A1942',
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

function StepCard({ step, active, dayNum, onPress, onEdit, canEdit, onLongPress, reordering }) {
  const initials = getInitials(step.name);
  const bg = STEP_COLORS[step.type] ?? '#1B4332';
  const hasPhoto = !!step.photoUrl;
  const nbHeberg = step.accommodation ? 1 : 0;
  const nbActiv  = Array.isArray(step.activities) ? step.activities.length : 0;

  const handlePress = () => {
    if (canEdit) {
      onEdit();
    } else {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={[styles.card, active && styles.cardActive, reordering && styles.cardReordering, { backgroundColor: bg }]}
      activeOpacity={0.85}
    >
      {/* Photo plein format */}
      {hasPhoto && (
        <Image
          source={{ uri: step.photoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {/* Overlay sombre uniforme — pas de bord visible */}
      <View style={styles.cardOverlay1} />

      {/* Badge réorganisation */}
      {reordering && (
        <View style={styles.cardReorderBadge}>
          <Text style={styles.cardReorderBadgeText}>✥</Text>
        </View>
      )}

      {/* Badge jour — top left */}
      {dayNum != null && (
        <View style={styles.cardDayBadge}>
          <Text style={styles.cardDayText}>J{dayNum}</Text>
        </View>
      )}

      {/* Contenu overlay bas */}
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{step.name}</Text>
        {step.startDate ? (() => {
          const start = formatDate(step.startDate);
          const end = step.endDate && step.endDate !== step.startDate ? formatDate(step.endDate) : null;
          return <Text style={styles.cardDate}>{end ? `${start} → ${end}` : start}</Text>;
        })() : null}
        {step.location ? (
          <Text style={styles.cardLocation} numberOfLines={1}>📍 {step.location}</Text>
        ) : null}
        {(nbHeberg > 0 || nbActiv > 0) ? (
          <View style={styles.cardCounts}>
            {nbHeberg > 0 && (
              <Text style={styles.cardCountText}>🏨 {nbHeberg}</Text>
            )}
            {nbActiv > 0 && (
              <Text style={styles.cardCountText}>🎯 {nbActiv}</Text>
            )}
          </View>
        ) : null}
      </View>
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
  const { deleteStep, deleteRoadtrip, updateStep } = useRoadtripStore();
  const { roadtrip: syncedRoadtrip } = useRoadtrip(id);
  const { role, isOwner: roleIsOwner, canEdit: roleCanEdit, isLoading: roleLoading } = useRoadtripRole(id);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);
  const [reorderMode, setReorderMode] = useState(false);
  const [localSteps, setLocalSteps] = useState([]);
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
  const displaySteps = reorderMode ? localSteps : steps;
  const selectedStep = displaySteps[selectedStepIdx] ?? null;
  const stepsWithCoords = displaySteps.filter(s => s.latitude != null && s.longitude != null && !isNaN(parseFloat(s.latitude)) && !isNaN(parseFloat(s.longitude)));

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
    timelineRef.current.scrollTo({ x: selectedStepIdx * SNAP_W, animated: true });
  }, [selectedStepIdx]);

  // ─── Date helpers (local time — jamais UTC) ────────────────────────────────
  const fromLocalDateStr = (str) => {
    if (!str) return null;
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  };
  const toLocalDateStr = (d) => {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // ─── Réorganisation des étapes ──────────────────────────────────────────────
  const enterReorderMode = () => {
    setLocalSteps([...steps]);
    setReorderMode(true);
    setMenuVisible(false);
  };

  const moveStep = (idx, direction) => {
    const newSteps = [...localSteps];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= newSteps.length) return;
    [newSteps[idx], newSteps[targetIdx]] = [newSteps[targetIdx], newSteps[idx]];
    setLocalSteps(newSteps);
    setSelectedStepIdx(targetIdx);
    // Centrer la timeline sur la carte en cours de déplacement
    const scrollX = Math.max(0, targetIdx * SNAP_W - (SCREEN_W - CARD_W) / 2);
    setTimeout(() => {
      timelineRef.current?.scrollTo({ x: scrollX, animated: true });
    }, 50);
  };

  const saveReorder = async () => {
    try {
      const baseDate = rt?.startDate ? fromLocalDateStr(rt.startDate) : null;
      let cursor = baseDate ? new Date(baseDate) : null;
      for (let i = 0; i < localSteps.length; i++) {
        const step = localSteps[i];
        const updates = { order: i };
        if (cursor) {
          const origStart = fromLocalDateStr(step.startDate);
          const origEnd = step.endDate ? fromLocalDateStr(step.endDate) : origStart;
          const duration = (origStart && origEnd)
            ? Math.max(1, Math.round((origEnd - origStart) / 86400000) + 1)
            : 1;
          updates.startDate = toLocalDateStr(cursor);
          const endObj = new Date(cursor);
          endObj.setDate(endObj.getDate() + duration - 1);
          updates.endDate = toLocalDateStr(endObj);
          cursor = new Date(endObj);
          cursor.setDate(cursor.getDate() + 1);
        }
        await updateStep(step.id, updates);
      }
      setReorderMode(false);
    } catch {
      Alert.alert('Erreur', "Impossible de sauvegarder l'ordre.");
    }
  };

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
            const stepIdx = displaySteps.indexOf(step);
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

          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerBtnText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ─── Timeline Polarsteps ───────────────────────────────────── */}
      <View style={[styles.timelineContainer, { paddingBottom: Math.max(bottom, 12) }]}>
        {/* Barre mode réorganisation */}
        {reorderMode && (
          <View style={styles.reorderBar}>
            <Text style={styles.reorderBarHint}>Appui long pour saisir · ← → pour déplacer</Text>
            <TouchableOpacity style={styles.reorderCancelBtn} onPress={() => setReorderMode(false)}>
              <Text style={styles.reorderCancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reorderDoneBtn} onPress={saveReorder}>
              <Text style={styles.reorderDoneBtnText}>Valider</Text>
            </TouchableOpacity>
          </View>
        )}
        <ScrollView
          ref={timelineRef}
          horizontal
          style={{ height: CARD_H }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.timelineContent, { paddingHorizontal: SIDE_PAD }]}
          snapToInterval={SNAP_W}
          decelerationRate="fast"
          snapToAlignment="start"
          onMomentumScrollEnd={(e) => {
            if (reorderMode) return; // la sélection suit la carte déplacée, pas le scroll
            const newIdx = Math.round(e.nativeEvent.contentOffset.x / SNAP_W);
            if (newIdx >= 0 && newIdx < displaySteps.length) setSelectedStepIdx(newIdx);
          }}
        >
          {displaySteps.map((step, idx) => (
            <View key={step.id} style={[styles.timelineRow, { marginRight: CARD_GAP, position: 'relative' }]}>
              <StepCard
                step={step}
                active={idx === selectedStepIdx}
                dayNum={dayOffset(rt.startDate, step.startDate)}
                onPress={() => setSelectedStepIdx(idx)}
                onEdit={reorderMode ? () => setSelectedStepIdx(idx) : () => navigation.navigate('EditStep', { step })}
                onLongPress={effectiveCanEdit && !reorderMode ? () => {
                  setLocalSteps([...displaySteps]);
                  setSelectedStepIdx(idx);
                  setReorderMode(true);
                } : undefined}
                canEdit={effectiveCanEdit}
                reordering={reorderMode && idx === selectedStepIdx}
              />
              {/* Flèches de réorganisation — carte sélectionnée uniquement */}
              {reorderMode && idx === selectedStepIdx && (
                <View style={styles.reorderOverlay} pointerEvents="box-none">
                  <TouchableOpacity
                    style={[styles.reorderArrow, idx === 0 && styles.reorderArrowDisabled]}
                    onPress={() => idx > 0 && moveStep(idx, -1)}
                  >
                    <Text style={styles.reorderArrowText}>←</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reorderArrow, idx === displaySteps.length - 1 && styles.reorderArrowDisabled]}
                    onPress={() => idx < displaySteps.length - 1 && moveStep(idx, 1)}
                  >
                    <Text style={styles.reorderArrowText}>→</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!reorderMode && effectiveCanEdit && idx < displaySteps.length - 1 && (
                <AddButton
                  onPress={() => navigation.navigate('CreateStep', {
                    roadtripId: rt.id,
                    stepCount: displaySteps.length,
                    insertAfterIdx: idx,
                    startDate: rt.startDate,
                  })}
                />
              )}
            </View>
          ))}

          {/* Bouton "+" final — masqué en mode réorganisation */}
          {!reorderMode && effectiveCanEdit && (
            <TouchableOpacity
              style={[styles.cardAddNew, { marginLeft: steps.length > 0 ? 0 : 0 }]}
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
              <Text style={styles.cardAddNewLabel}>Ajouter une étape</Text>
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
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('Collaborators', { roadtripId: id }); }}>
              <Text style={styles.menuItemIcon}>👥</Text>
              <Text style={styles.menuItemLabel}>Collaborateurs</Text>
            </TouchableOpacity>
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

  // Info panel — supprimé (la carte est le point d'entrée)

  // Timeline
  timelineContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,22,14,0.92)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: SPACING.sm,
    elevation: 5,
    zIndex: 5,
  },
  timelineContent: { alignItems: 'flex-start', paddingBottom: 4 },
  timelineRow: { flexDirection: 'row', alignItems: 'center' },

  // Step card — poster avec photo en fond
  card: {
    width: CARD_W, height: CARD_H,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardActive: {
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  // Overlay sombre uniforme (un seul layer = pas de bord visible)
  cardOverlay1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  // Badge jour
  cardDayBadge: {
    position: 'absolute', top: SPACING.sm, left: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  cardDayText: { color: COLORS.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  // Icône édition
  cardEditBadge: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardEditIcon: { fontSize: 13 },
  // Contenu bas
  cardContent: {
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: 2,
  },
  cardName: { fontSize: 15, color: '#fff', fontWeight: '700', lineHeight: 20 },
  cardDate: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  cardLocation: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  cardCounts: { flexDirection: 'row', gap: SPACING.sm, marginTop: 2 },
  cardCountText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  // Add between — petit bouton flottant à droite de la carte
  addBetween: {
    position: 'absolute', right: -CARD_GAP / 2 - 10, top: '50%',
    marginTop: -14,
    zIndex: 10,
  },
  addBetweenLine: { display: 'none' },
  addBetweenCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(10,22,14,0.95)',
  },
  addBetweenPlus: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 18, includeFontPadding: false },

  // Add new (fin de timeline)
  cardAddNew: {
    width: CARD_W, height: CARD_H,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(52,168,83,0.06)',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.accent,
    borderStyle: 'dashed',
    gap: SPACING.sm,
  },
  cardAddNewCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  cardAddNewPlus: { color: COLORS.accent, fontSize: 26, fontWeight: '300', lineHeight: 30 },
  cardAddNewLabel: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },

  // Reorder mode
  reorderBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(52,168,83,0.15)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(52,168,83,0.3)',
  },
  reorderBarHint: { fontSize: 11, color: 'rgba(255,255,255,0.6)', flex: 1 },
  reorderCancelBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
  },
  reorderCancelBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  reorderDoneBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
  },
  reorderDoneBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  // Carte en cours de déplacement
  cardReordering: {
    borderColor: COLORS.accent,
    borderWidth: 2.5,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 14, elevation: 14,
    transform: [{ scale: 1.03 }],
  },
  cardReorderBadge: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  cardReorderBadgeText: { color: COLORS.accent, fontSize: 14, lineHeight: 18, includeFontPadding: false },
  reorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
  },
  reorderArrow: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  reorderArrowDisabled: { opacity: 0.25 },
  reorderArrowText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 24, includeFontPadding: false },

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