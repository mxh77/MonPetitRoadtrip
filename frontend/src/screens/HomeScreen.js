import React, { useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Animated, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING, ROADTRIP_STATUS } from '../theme';
import { useAuthStore } from '../store/authStore';
import { useRoadtripStore } from '../store/roadtripStore';

function StatusBadge({ status }) {
  const cfg = ROADTRIP_STATUS[status] || ROADTRIP_STATUS.DRAFT;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function RoadtripCard({ item, onPress, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;

  const handleLongPress = () => {
    Alert.alert(
      'Supprimer ce roadtrip ?',
      `"${item.title}" sera définitivement supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  const stepCount = item.steps?.length || 0;
  const dateText =
    item.startDate
      ? new Date(item.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.cardMeta}>
        {dateText && <Text style={styles.cardMetaText}>📅 {dateText}</Text>}
        <Text style={styles.cardMetaText}>📍 {stepCount} étape{stepCount !== 1 ? 's' : ''}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { roadtrips, fetchRoadtrips, deleteRoadtrip, loading } = useRoadtripStore();

  useEffect(() => {
    fetchRoadtrips();
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteRoadtrip(id);
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer ce roadtrip.');
    }
  }, [deleteRoadtrip]);

  const renderItem = ({ item }) => (
    <RoadtripCard
      item={item}
      onPress={() => navigation.navigate('RoadtripDetail', { id: item.id, title: item.title })}
      onDelete={() => handleDelete(item.id)}
    />
  );

  const ListEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🗺</Text>
      <Text style={styles.emptyTitle}>Aucun roadtrip</Text>
      <Text style={styles.emptyText}>Appuyez sur + pour créer votre premier voyage.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour{user?.name ? `, ${user.name}` : ''}</Text>
          <Text style={styles.title}>
            Mes <Text style={styles.titleAccent}>roadtrips</Text>
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>⎋</Text>
        </TouchableOpacity>
      </View>

      {/* ─── List ─────────────────────────────────────────────────────────── */}
      {loading && roadtrips.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={roadtrips}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={ListEmpty}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchRoadtrips}
              tintColor={COLORS.accent}
            />
          }
        />
      )}

      {/* ─── FAB ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateRoadtrip')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  greeting: {
    color: COLORS.textMuted,
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 34,
    color: COLORS.text,
  },
  titleAccent: {
    fontFamily: FONTS.titleItalic,
    color: COLORS.accent,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontSize: 18, color: COLORS.textMuted },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.lg, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontFamily: FONTS.titleRegular,
    fontSize: 20,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardMeta: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  cardMetaText: { color: COLORS.textMuted, fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: {
    fontFamily: FONTS.title,
    fontSize: 24,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { color: COLORS.bg, fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
