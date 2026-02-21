import React, { useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Animated, PanResponder, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING, ROADTRIP_STATUS } from '../theme';
import { useAuthStore } from '../store/authStore';
import { useRoadtripStore } from '../store/roadtripStore';
import { useRoadtrips } from '../hooks/usePowerSync';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INITIALS_COLORS = ['#2D6A4F','#1D3557','#6B3A2A','#4A1942','#1B4332','#7B3F00'];
const SWIPE_THRESHOLD = -80;
const DELETE_BUTTON_WIDTH = 80;

function getInitialsColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return INITIALS_COLORS[Math.abs(h) % INITIALS_COLORS.length];
}
function getInitials(title) {
  const words = title.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + (words[1][0] || '')).toUpperCase();
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}
function durationDays(start, end) {
  if (!start || !end) return null;
  const d = Math.round((new Date(end) - new Date(start)) / 86400000);
  return d > 0 ? d : null;
}
function formatDate(dateStr, opts = { day: 'numeric', month: 'short' }) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('fr-FR', opts);
}
function planningPercent(rt) {
  const base = { DRAFT: 15, PLANNED: 65, ONGOING: 85, COMPLETED: 100 };
  return base[rt.status] ?? 15;
}
function nextUpcoming(roadtrips) {
  const upcoming = roadtrips
    .filter(r => r.startDate && (r.status === 'PLANNED' || r.status === 'ONGOING'))
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  return upcoming[0] ?? roadtrips[0] ?? null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, dark }) {
  const cfg = ROADTRIP_STATUS[status] || ROADTRIP_STATUS.DRAFT;
  return (
    <View style={[styles.badge, { backgroundColor: dark ? 'rgba(255,255,255,0.12)' : cfg.bg }]}>
      {dark && <View style={[styles.badgeDot, { backgroundColor: cfg.color }]} />}
      <Text style={[styles.badgeText, { color: dark ? COLORS.text : cfg.color }]}>
        {cfg.label.toUpperCase()}
      </Text>
    </View>
  );
}

function FeaturedCard({ roadtrip, onPress }) {
  const pct = planningPercent(roadtrip);
  const dateRange = roadtrip.startDate
    ? `${formatDate(roadtrip.startDate)} – ${formatDate(roadtrip.endDate) ?? '?'}`
    : null;
  const dur = durationDays(roadtrip.startDate, roadtrip.endDate);
  const steps = Number(roadtrip.stepCount ?? 0);
  const words = roadtrip.title.trim().split(' ');
  const midIdx = Math.max(1, Math.floor(words.length / 2));
  const titleStart = words.slice(0, midIdx).join(' ');
  const titleEnd = words.slice(midIdx).join(' ');

  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.featuredBg}>
        <View style={styles.mountain1} />
        <View style={styles.mountain2} />
      </View>
      <View style={styles.featuredTop}>
        <StatusBadge status={roadtrip.status} dark />
        <View style={styles.featuredArrow}>
          <Text style={styles.featuredArrowText}>↗</Text>
        </View>
      </View>
      <Text style={styles.featuredTitle}>
        {titleStart}
        {titleEnd ? <Text style={styles.featuredTitleItalic}>{' ' + titleEnd}</Text> : null}
      </Text>
      <View style={styles.featuredMeta}>
        {dateRange && <Text style={styles.featuredMetaText}>📅 {dateRange}</Text>}
        {steps > 0 && <Text style={styles.featuredMetaText}>📍 {steps} étape{steps !== 1 ? 's' : ''}</Text>}
        {dur && <Text style={styles.featuredMetaText}>→ {dur} jours</Text>}
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>PLANIFICATION</Text>
        <Text style={styles.progressPct}>{pct}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

function NextDepartureBanner({ roadtrip }) {
  const days = daysUntil(roadtrip.startDate);
  if (days === null || days < 0) return null;
  return (
    <View style={styles.banner}>
      <View style={styles.bannerLeft}>
        <View style={styles.bannerIcon}>
          <Text style={{ fontSize: 18 }}>🕐</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerLabel}>PROCHAIN DÉPART</Text>
          <Text style={styles.bannerTitle} numberOfLines={1}>{roadtrip.title}</Text>
        </View>
      </View>
      <View style={styles.bannerBadge}>
        <Text style={styles.bannerBadgeNum}>{days}</Text>
        <Text style={styles.bannerBadgeUnit}>jours</Text>
      </View>
    </View>
  );
}

function RoadtripRow({ item, onPress, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < Math.abs(g.dx),
    onPanResponderMove: (_, g) => {
      const dx = Math.min(0, Math.max(g.dx + (isOpen.current ? -DELETE_BUTTON_WIDTH : 0), -DELETE_BUTTON_WIDTH));
      translateX.setValue(dx);
    },
    onPanResponderRelease: (_, g) => {
      const shouldOpen = g.dx < SWIPE_THRESHOLD;
      isOpen.current = shouldOpen;
      Animated.spring(translateX, { toValue: shouldOpen ? -DELETE_BUTTON_WIDTH : 0, useNativeDriver: true, bounciness: 4 }).start();
    },
  })).current;

  const close = () => {
    isOpen.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  const handleDelete = () => {
    close();
    Alert.alert('Supprimer ce roadtrip ?', `"${item.title}" sera définitivement supprimé.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onDelete },
    ]);
  };

  const initials = getInitials(item.title);
  const color = getInitialsColor(item.title);
  const dateText = item.startDate
    ? new Date(item.startDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : 'Non daté';
  const dur = durationDays(item.startDate, item.endDate);
  const steps = Number(item.stepCount ?? 0);

  return (
    <View style={styles.rowWrapper}>
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteBtnIcon}>🗑</Text>
        <Text style={styles.deleteBtnText}>Suppr.</Text>
      </TouchableOpacity>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => isOpen.current ? close() : onPress()}
          activeOpacity={0.8}
        >
          <View style={[styles.rowInitials, { backgroundColor: color }]}>
            <Text style={styles.rowInitialsText}>{initials}</Text>
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.rowMeta}>{dateText}{dur ? ` · ${dur} jours` : ''}</Text>
            <View style={styles.rowFooter}>
              <StatusBadge status={item.status} />
              {steps > 0 && <Text style={styles.rowSteps}>{steps} étape{steps !== 1 ? 's' : ''}</Text>}
            </View>
          </View>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'home',     icon: '⌂', label: 'Accueil' },
  { key: 'map',      icon: '◎', label: 'Carte' },
  { key: 'planning', icon: '▦', label: 'Planning' },
  { key: 'profile',  icon: '◯', label: 'Profil' },
];

function TabBar({ active }) {
  return (
    <View style={styles.tabBar}>
      {TABS.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tabItem}
          onPress={() => tab.key !== 'home' && Alert.alert('Bientôt disponible', `L'écran "${tab.label}" arrive prochainement.`)}
        >
          <Text style={[styles.tabIcon, active === tab.key && styles.tabIconActive]}>{tab.icon}</Text>
          <Text style={[styles.tabLabel, active === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { deleteRoadtrip } = useRoadtripStore();
  const { roadtrips, isLoading } = useRoadtrips();

  const featured = nextUpcoming(roadtrips);
  const otherRoadtrips = roadtrips.filter(r => r.id !== featured?.id);

  const handleDelete = useCallback(async (id) => {
    try { await deleteRoadtrip(id); }
    catch { Alert.alert('Erreur', 'Impossible de supprimer ce roadtrip.'); }
  }, [deleteRoadtrip]);

  const goToRoadtrip = (item) => navigation.navigate('RoadtripDetail', { id: item.id, title: item.title });

  const firstName = user?.name?.split(/[\s&]+/)[0]?.trim() ?? '';
  const restName = user?.name ? user.name.slice(firstName.length) : '';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ─── Header ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>BONJOUR 🔥</Text>
            <Text style={styles.heroName}>
              {firstName}
              {restName ? <Text style={styles.heroNameItalic}>{restName}</Text> : null}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Text style={styles.iconBtnText}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.avatarBtn]} onPress={logout}>
              <Text style={styles.avatarText}>{(user?.name?.[0] ?? '?').toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading && roadtrips.length === 0 ? (
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.accent} size="large" />
          </View>
        ) : roadtrips.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗺</Text>
            <Text style={styles.emptyTitle}>Aucun roadtrip</Text>
            <Text style={styles.emptyText}>Appuyez sur + pour créer votre premier voyage.</Text>
          </View>
        ) : (
          <>
            {/* ─── Prochain départ ──────────────────────────────────────── */}
            {featured && <NextDepartureBanner roadtrip={featured} />}

            {/* ─── Voyage à venir ───────────────────────────────────────── */}
            {featured && (
              <>
                <Text style={styles.sectionLabel}>VOYAGE À VENIR</Text>
                <FeaturedCard roadtrip={featured} onPress={() => goToRoadtrip(featured)} />
              </>
            )}

            {/* ─── Autres roadtrips ─────────────────────────────────────── */}
            {otherRoadtrips.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>MES ROADTRIPS</Text>
                {otherRoadtrips.map(item => (
                  <RoadtripRow
                    key={item.id}
                    item={item}
                    onPress={() => goToRoadtrip(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── FAB ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateRoadtrip')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ─── Tab bar ──────────────────────────────────────────────────────── */}
      <TabBar active="home" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.lg },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  greeting: { fontSize: 11, letterSpacing: 2, color: COLORS.textMuted, marginBottom: 2 },
  heroName: { fontFamily: FONTS.title, fontSize: 36, color: COLORS.text, lineHeight: 42 },
  heroNameItalic: { fontFamily: FONTS.titleItalic, color: COLORS.accent },
  headerIcons: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
  iconBtn: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontSize: 17 },
  avatarBtn: { backgroundColor: COLORS.accent },
  avatarText: { fontFamily: FONTS.title, fontSize: 18, color: COLORS.bg },

  // Loader / Empty
  loader: { paddingTop: 80, alignItems: 'center' },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontFamily: FONTS.title, fontSize: 24, color: COLORS.text, marginBottom: SPACING.xs },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },

  // Banner "Prochain départ"
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg,
    borderLeftWidth: 3, borderLeftColor: COLORS.accent,
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  bannerIcon: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentDim, alignItems: 'center', justifyContent: 'center',
  },
  bannerLabel: { fontSize: 10, letterSpacing: 1.5, color: COLORS.textMuted, marginBottom: 2 },
  bannerTitle: { fontFamily: FONTS.titleRegular, fontSize: 16, color: COLORS.text },
  bannerBadge: { alignItems: 'center', marginLeft: SPACING.md },
  bannerBadgeNum: { fontFamily: FONTS.title, fontSize: 28, color: COLORS.accent, lineHeight: 30 },
  bannerBadgeUnit: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.5 },

  // Section label
  sectionLabel: { fontSize: 11, letterSpacing: 2, color: COLORS.textMuted, marginBottom: SPACING.sm, marginTop: SPACING.xs },

  // Featured card
  featuredCard: {
    backgroundColor: '#0D1F14', borderRadius: RADIUS.xl,
    padding: SPACING.lg, marginBottom: SPACING.xl, overflow: 'hidden', minHeight: 200,
  },
  featuredBg: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  mountain1: {
    position: 'absolute', bottom: 0, left: -20, width: 0, height: 0,
    borderLeftWidth: 140, borderRightWidth: 140, borderBottomWidth: 100,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#122010',
  },
  mountain2: {
    position: 'absolute', bottom: 0, right: -10, width: 0, height: 0,
    borderLeftWidth: 120, borderRightWidth: 80, borderBottomWidth: 80,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#0A1A0A',
  },
  featuredTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  featuredArrow: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  featuredArrowText: { color: '#F2EFE8', fontSize: 16 },
  featuredTitle: { fontFamily: FONTS.title, fontSize: 32, color: '#F2EFE8', lineHeight: 36, marginBottom: SPACING.sm },
  featuredTitleItalic: { fontFamily: FONTS.titleItalic, color: COLORS.accent },
  featuredMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.md },
  featuredMetaText: { color: 'rgba(242,239,232,0.6)', fontSize: 13 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 10, letterSpacing: 1.5, color: 'rgba(242,239,232,0.4)' },
  progressPct: { fontSize: 10, letterSpacing: 1, color: COLORS.accent },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.full },
  progressFill: { height: 3, backgroundColor: COLORS.accent, borderRadius: RADIUS.full },

  // Badge
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4, gap: 5 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },

  // Row (list item)
  rowWrapper: { marginBottom: SPACING.sm, borderRadius: RADIUS.lg },
  deleteBtn: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_BUTTON_WIDTH,
    backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.lg,
  },
  deleteBtnIcon: { fontSize: 18 },
  deleteBtnText: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  rowInitials: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowInitialsText: { fontFamily: FONTS.title, fontSize: 18, color: '#fff' },
  rowContent: { flex: 1 },
  rowTitle: { fontFamily: FONTS.titleRegular, fontSize: 17, color: COLORS.text, marginBottom: 2 },
  rowMeta: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  rowFooter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rowSteps: { fontSize: 11, color: COLORS.textMuted },
  rowArrow: { fontSize: 22, color: COLORS.textDim, flexShrink: 0 },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: 8, paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 20, color: COLORS.textMuted },
  tabIconActive: { color: COLORS.accent },
  tabLabel: { fontSize: 10, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.accent, fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 78,
    right: SPACING.lg,
    width: 52, height: 52, borderRadius: RADIUS.full, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: COLORS.bg, fontSize: 26, fontWeight: '300', lineHeight: 30 },
});
