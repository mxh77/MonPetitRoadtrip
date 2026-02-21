import { useQuery } from '@powersync/react-native';
import { useAuthStore } from '../store/authStore';

/**
 * Retourne tous les roadtrips de l'utilisateur connecté.
 * Réactif : se met à jour automatiquement quand la DB locale change.
 */
export function useRoadtrips() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isLoading, error } = useQuery(
    userId
      ? `SELECT r.*, COUNT(s.id) as stepCount
         FROM roadtrips r
         LEFT JOIN steps s ON s.roadtripId = r.id
         WHERE r.userId = ?
         GROUP BY r.id
         ORDER BY r.createdAt DESC`
      : 'SELECT * FROM roadtrips WHERE 1=0',
    userId ? [userId] : []
  );
  return { roadtrips: data ?? [], isLoading, error };
}

/**
 * Retourne un roadtrip avec ses steps, activités et hébergements.
 */
export function useRoadtrip(id) {
  const { data: roadtripRows } = useQuery(
    id ? 'SELECT * FROM roadtrips WHERE id = ?' : 'SELECT * FROM roadtrips WHERE 1=0',
    id ? [id] : []
  );

  const { data: steps } = useQuery(
    id ? 'SELECT * FROM steps WHERE roadtripId = ? ORDER BY "order" ASC' : 'SELECT * FROM steps WHERE 1=0',
    id ? [id] : []
  );

  const { data: accommodations } = useQuery(
    id
      ? 'SELECT * FROM accommodations WHERE stepId IN (SELECT id FROM steps WHERE roadtripId = ?)'
      : 'SELECT * FROM accommodations WHERE 1=0',
    id ? [id] : []
  );

  const { data: activities } = useQuery(
    id
      ? 'SELECT * FROM activities WHERE stepId IN (SELECT id FROM steps WHERE roadtripId = ?) ORDER BY "order" ASC'
      : 'SELECT * FROM activities WHERE 1=0',
    id ? [id] : []
  );

  const roadtrip = roadtripRows?.[0] ?? null;

  // Assembler les steps avec leurs relations
  const stepsWithRelations = (steps ?? []).map((step) => ({
    ...step,
    accommodation: (accommodations ?? []).find((a) => a.stepId === step.id) ?? null,
    activities: (activities ?? []).filter((a) => a.stepId === step.id),
  }));

  return {
    roadtrip: roadtrip ? { ...roadtrip, steps: stepsWithRelations } : null,
  };
}

/**
 * Retourne les activités d'un step.
 */
export function useActivities(stepId) {
  const { data } = useQuery(
    stepId
      ? 'SELECT * FROM activities WHERE stepId = ? ORDER BY "order" ASC'
      : 'SELECT * FROM activities WHERE 1=0',
    stepId ? [stepId] : []
  );
  return { activities: data ?? [] };
}

/**
 * Retourne un step avec son hébergement et ses activités.
 */
export function useStep(stepId) {
  const { data: stepRows } = useQuery(
    stepId ? 'SELECT * FROM steps WHERE id = ?' : 'SELECT * FROM steps WHERE 1=0',
    stepId ? [stepId] : []
  );
  const { data: accommodationRows } = useQuery(
    stepId ? 'SELECT * FROM accommodations WHERE stepId = ?' : 'SELECT * FROM accommodations WHERE 1=0',
    stepId ? [stepId] : []
  );
  const { data: activities } = useQuery(
    stepId
      ? 'SELECT * FROM activities WHERE stepId = ? ORDER BY "order" ASC'
      : 'SELECT * FROM activities WHERE 1=0',
    stepId ? [stepId] : []
  );

  const step = stepRows?.[0] ?? null;
  return {
    step: step
      ? { ...step, accommodation: accommodationRows?.[0] ?? null, activities: activities ?? [] }
      : null,
  };
}
