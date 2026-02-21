import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING, ROADTRIP_STATUS, BOOKING_STATUS } from '../theme';
import { useRoadtripStore } from '../store/roadtripStore';
import { useRoadtrip } from '../hooks/usePowerSync';

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
function splitTitle(title) {
  const words = (title ?? '').trim().split(' ');
  const mid = Math.max(1, Math.floor(words.length / 2));
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}
function stepTypeBadge(step) {
  if (step.type === 'DEPARTURE') return { icon: '✈', label: 'DÉPART' };
  if (step.type === 'RETURN')    return { icon: '✈', label: 'RETOUR' };
  if (step.accommodation)        return { icon: '🌙', label: 'ÉTAPE AVEC NUITÉE' };
  if (step.type === 'STOP')      return { icon: '⏸', label: 'ARRÊT' };
  return { icon: '📍', label: 'ÉTAPE' };
}
const STEP_COLORS = {
  DEPARTURE: '#2D6A4F',
  RETURN:    '#1D3557',
  STAGE:     '#1B4332',
  STOP:      '#4A1942',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepCircle({ step, active, dayNum, onPress }) {
  const initials = getInitials(step.name);
  const bg = STEP_COLORS[step.type] ?? '#1B4332';
  const label = step.type === 'DEPARTURE' ? 'Départ'
              : step.type === 'RETURN'    ? 'Retour'
              : step.name;
  return (
    <TouchableOpacity style={styles.timelineItem} onPress={onPress}>
      <View style={[styles.timelineCircle, active && styles.timelineCircleActive, { backgroundColor: bg }]}>
        <Text style={styles.timelineInitials}>{initials}</Text>
        {active && <View style={styles.timelineRing} />}
      </View>
      {dayNum !== null && (
        <Text style={[styles.timelineDay, active && styles.timelineDayActive]}>
          {`JOUR ${dayNum}`}
        </Text>
      )}
      <Text style={[styles.timelineName, active && styles.timelineNameActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function AccommodationCard({ acc }) {
  const cfg = BOOKING_STATUS[acc.status] ?? BOOKING_STATUS.PLANNED;
  const nights = durationDays(acc.checkIn, acc.checkOut);
  const checkInText = formatDate(acc.checkIn, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <View style={styles.accCard}>
      <View style={styles.accIcon}>
        <Text style={{ fontSize: 20 }}>🏨</Text>
      </View>
      <View style={styles.accContent}>
        <Text style={styles.accName} numberOfLines={1}>{acc.name}</Text>
        <Text style={styles.accMeta}>
          {nights ? `${nights} nuit${nights > 1 ? 's' : ''}` : ''}
          {checkInText ? ` · Check-in ${checkInText}` : ''}
        </Text>
      </View>
      <View style={[styles.bookingBadge, { backgroundColor: cfg.color + '22' }]}>
        <Text style={[styles.bookingBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </View>
  );
}

function ActivityRow({ activity }) {
  const statusColor = BOOKING_STATUS[activity.status]?.color ?? COLORS.textMuted;
  return (
    <View style={styles.actRow}>
      <Text style={styles.actTime}>{activity.startTime ?? '--:--'}</Text>
      <View style={[styles.actDot, { backgroundColor: statusColor }]} />
      <Text style={styles.actName} numberOfLines={1}>{activity.name}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RoadtripDetailScreen({ route, navigation }) {
  const { id, roadtripData } = route.params;
  const { deleteStep, deleteRoadtrip } = useRoadtripStore();
  const { roadtrip: syncedRoadtrip } = useRoadtrip(id);
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('steps');
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);
  const timelineRef = useRef(null);
  const { bottom, top } = useSafeAreaInsets();

  const rt = syncedRoadtrip ?? (roadtripData ? { ...roadtripData, steps: [] } : null);

  useEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      title: '',
      headerTintColor: COLORS.text,
      headerRight: () => (
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ paddingHorizontal: 14 }}>
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '600' }}>⋯</Text>
        </TouchableOpacity>
      ),
    });
  }, []);

  const steps = rt?.steps ?? [];
  const selectedStep = steps[selectedStepIdx] ?? null;

  const handleDeleteRoadtrip = () => {
    setMenuVisible(false);
    Alert.alert(
      'Supprimer ce roadtrip ?',
      `« ${rt?.title} » sera définitivement supprimé avec toutes ses étapes.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try { await deleteRoadtrip(id); navigation.goBack(); }
            catch { Alert.alert('Erreur', 'Impossible de supprimer ce roadtrip.'); }
          },
        },
      ]
    );
  };

  if (!rt) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  const statusCfg = ROADTRIP_STATUS[rt.status] ?? ROADTRIP_STATUS.DRAFT;
  const dur = durationDays(rt.startDate, rt.endDate);
  const dateRange = rt.startDate
    ? `${formatDate(rt.startDate)} – ${formatDate(rt.endDate) ?? '?'}`
    : null;
  const [t1, t2] = splitTitle(rt.title);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>

      {/* ─── Header dark green ─────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        {/* Mountains decoration */}
        <View style={styles.heroBg}>
          <View style={styles.mountain1} />
          <View style={styles.mountain2} />
        </View>

        {/* Space for transparent nav header: status bar + nav bar (~44px) */}
        <View style={{ height: top + 66 }} />

        {/* Status badge */}
        <View style={styles.heroBadge}>
          <View style={[styles.heroBadgeDot, { backgroundColor: statusCfg.color }]} />
          <Text style={[styles.heroBadgeText, { color: statusCfg.color }]}>
            {statusCfg.label.toUpperCase()}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.heroTitle}>
          {t1}
          {t2 ? <Text style={styles.heroTitleItalic}>{' ' + t2}</Text> : null}
        </Text>

        {/* Meta */}
        <View style={styles.heroMeta}>
          {dateRange && <Text style={styles.heroMetaText}>📅 {dateRange}</Text>}
          {steps.length > 0 && <Text style={styles.heroMetaText}>📍 {steps.length} étape{steps.length > 1 ? 's' : ''}</Text>}
          {dur && <Text style={styles.heroMetaText}>· {dur} jours</Text>}
        </View>

        {/* Inner tabs */}
        <View style={styles.innerTabs}>
          {[['steps','ÉTAPES'],['map','CARTE'],['photos','PHOTOS']].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={styles.innerTab}
              onPress={() => key !== 'steps' && Alert.alert('Bientôt disponible')}
            >
              <Text style={[styles.innerTabText, activeTab === key && styles.innerTabTextActive]}>
                {label}
              </Text>
              {activeTab === key && <View style={styles.innerTabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ─── Timeline ──────────────────────────────────────────────────── */}
      {steps.length > 0 && (
        <View style={styles.timelineWrapper}>
          <ScrollView
            ref={timelineRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeline}
          >
            {steps.map((step, idx) => (
              <StepCircle
                key={step.id}
                step={step}
                active={idx === selectedStepIdx}
                dayNum={dayOffset(rt.startDate, step.startDate)}
                onPress={() => setSelectedStepIdx(idx)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ─── Step detail ───────────────────────────────────────────────── */}
      <ScrollView style={styles.detail} contentContainerStyle={styles.detailContent}>
        {selectedStep ? (
          <>
            {/* Step type badge */}
            {(() => {
              const badge = stepTypeBadge(selectedStep);
              return (
                <View style={styles.stepTypeBadge}>
                  <Text style={styles.stepTypeBadgeText}>{badge.icon} {badge.label}</Text>
                </View>
              );
            })()}

            {/* Step title */}
            {(() => {
              const [s1, s2] = splitTitle(selectedStep.name);
              return (
                <Text style={styles.stepTitle}>
                  {s1}
                  {s2 ? <Text style={styles.stepTitleItalic}>{s2}</Text> : null}
                </Text>
              );
            })()}

            {/* Step meta */}
            <View style={styles.stepMeta}>
              {selectedStep.startDate && (
                <Text style={styles.stepMetaText}>
                  📅 {formatDate(selectedStep.startDate)} – {formatDate(selectedStep.endDate) ?? '?'}
                </Text>
              )}
              {selectedStep.location && (
                <Text style={styles.stepMetaText}>📍 {selectedStep.location}</Text>
              )}
            </View>

            {/* ─── Hébergement ─────────────────────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>🛏 HÉBERGEMENT</Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => Alert.alert('Bientôt disponible', 'Ajout d\'hébergement arrive prochainement.')}
                >
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              {selectedStep.accommodation ? (
                <AccommodationCard acc={selectedStep.accommodation} />
              ) : (
                <Text style={styles.emptySection}>Aucun hébergement ajouté</Text>
              )}
            </View>

            {/* ─── Activités ───────────────────────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>⭐ ACTIVITÉS</Text>
              </View>
              {(selectedStep.activities ?? []).length === 0 ? (
                <Text style={styles.emptySection}>Aucune activité ajoutée</Text>
              ) : (
                (selectedStep.activities ?? []).map((act) => (
                  <ActivityRow key={act.id} activity={act} />
                ))
              )}
            </View>
          </>
        ) : steps.length === 0 ? (
          <View style={styles.emptySteps}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyText}>Aucune étape pour l'instant.</Text>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── FAB nouvelle étape ─────────────────────────────────────── */}
      {activeTab === 'steps' && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 100 + Math.max(bottom, 8) }]}
          onPress={() => navigation.navigate('CreateStep', {
            roadtripId: rt.id,
            stepCount: steps.length,
            startDate: rt.startDate,
          })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* ─── Tab bar (bottom) ──────────────────────────────────────────── */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(bottom, 8) }]}>
        {[['home','⌂','Accueil'],['map','◎','Carte'],['planning','▦','Planning'],['profile','◯','Profil']].map(([key, icon, label]) => (
          <TouchableOpacity
            key={key}
            style={styles.tabItem}
            onPress={() => {
              if (key === 'home') navigation.navigate('Home');
              else Alert.alert('Bientôt disponible', `L'écran "${label}" arrive prochainement.`);
            }}
          >
            <Text style={[styles.tabIcon, key === 'home' && styles.tabIconActive]}>{icon}</Text>
            <Text style={[styles.tabLabel, key === 'home' && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Menu ⋯ ────────────────────────────────────────────────────── */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuSheet, { paddingBottom: Math.max(bottom, 16) }]}>
                <View style={styles.menuHandle} />
                <Text style={styles.menuTitle}>Options</Text>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleDeleteRoadtrip}>
                  <Text style={styles.menuItemIconDanger}>🗑</Text>
                  <Text style={styles.menuItemLabelDanger}>Supprimer ce roadtrip</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loader: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },

  // Hero header
  heroCard: { backgroundColor: '#0D1F14', overflow: 'hidden', paddingHorizontal: SPACING.lg, paddingBottom: 0 },
  heroBg: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  mountain1: {
    position: 'absolute', bottom: 0, left: -20,
    width: 0, height: 0,
    borderLeftWidth: 160, borderRightWidth: 160, borderBottomWidth: 90,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#122010',
  },
  mountain2: {
    position: 'absolute', bottom: 0, right: -10,
    width: 0, height: 0,
    borderLeftWidth: 130, borderRightWidth: 90, borderBottomWidth: 70,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#0A1A0A',
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: SPACING.sm,
  },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 4 },
  heroBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { fontFamily: FONTS.title, fontSize: 40, color: '#F2EFE8', lineHeight: 44, marginBottom: SPACING.xs },
  heroTitleItalic: { fontFamily: FONTS.titleItalic, color: COLORS.accent },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.lg },
  heroMetaText: { color: 'rgba(242,239,232,0.6)', fontSize: 13 },

  // Inner tabs
  innerTabs: { flexDirection: 'row', gap: SPACING.xl, paddingTop: SPACING.xs },
  innerTab: { paddingBottom: SPACING.sm, position: 'relative' },
  innerTabText: { fontSize: 13, fontWeight: '700', letterSpacing: 1, color: 'rgba(242,239,232,0.4)' },
  innerTabTextActive: { color: '#F2EFE8' },
  innerTabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: COLORS.accent, borderRadius: 1 },

  // Timeline
  timelineWrapper: { backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  timeline: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: 4 },
  timelineItem: { alignItems: 'center', width: 72, marginHorizontal: 4 },
  timelineCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  timelineCircleActive: { },
  timelineRing: {
    position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 30, borderWidth: 2, borderColor: COLORS.accent,
  },
  timelineInitials: { fontFamily: FONTS.title, fontSize: 18, color: '#fff' },
  timelineDay: { fontSize: 9, color: COLORS.textDim, letterSpacing: 0.5, marginTop: 6, fontWeight: '700' },
  timelineDayActive: { color: COLORS.accent },
  timelineName: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  timelineNameActive: { color: COLORS.text, fontWeight: '600' },

  // Step detail
  detail: { flex: 1 },
  detailContent: { padding: SPACING.lg },
  stepTypeBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.accentDim, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.accent + '44',
  },
  stepTypeBadgeText: { fontSize: 11, color: COLORS.accent, fontWeight: '700', letterSpacing: 0.8 },
  stepTitle: { fontFamily: FONTS.title, fontSize: 36, color: COLORS.text, lineHeight: 40, marginBottom: SPACING.xs },
  stepTitleItalic: { fontFamily: FONTS.titleItalic, color: COLORS.accent },
  stepMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.lg },
  stepMetaText: { color: COLORS.textMuted, fontSize: 13 },

  // Sections
  section: { marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, color: COLORS.textMuted, fontWeight: '700' },
  addBtn: {
    width: 28, height: 28, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: COLORS.accent, fontSize: 18, lineHeight: 20, fontWeight: '300' },
  emptySection: { color: COLORS.textDim, fontSize: 13, fontStyle: 'italic', paddingVertical: SPACING.sm },

  // Accommodation card
  accCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  accIcon: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
  },
  accContent: { flex: 1 },
  accName: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  accMeta: { color: COLORS.textMuted, fontSize: 12 },
  bookingBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  bookingBadgeText: { fontSize: 11, fontWeight: '700' },

  // Activity row
  actRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 8 },
  actTime: { color: COLORS.textMuted, fontSize: 13, width: 44, textAlign: 'right' },
  actDot: { width: 8, height: 8, borderRadius: 4 },
  actName: { flex: 1, color: COLORS.text, fontSize: 15 },

  // Empty states
  emptySteps: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },

  // FAB
  fab: {
    position: 'absolute', right: SPACING.lg,
    width: 52, height: 52, borderRadius: RADIUS.full, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: COLORS.bg, fontSize: 26, fontWeight: '300', lineHeight: 30 },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 20, color: COLORS.textMuted },
  tabIconActive: { color: COLORS.accent },
  tabLabel: { fontSize: 10, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.accent, fontWeight: '600' },

  // Menu modal
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  menuSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  menuHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SPACING.md,
  },
  menuTitle: { fontFamily: FONTS.title, fontSize: 22, color: COLORS.text, marginBottom: SPACING.md },
  menuDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  menuItemIconDanger: { fontSize: 20, color: COLORS.error },
  menuItemLabelDanger: { fontSize: 16, color: COLORS.error, fontWeight: '600' },
});