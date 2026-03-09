import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import API_URL from '../api/config';

/**
 * Hook qui retourne le rôle de l'utilisateur connecté sur un roadtrip donné.
 * Fait un appel REST (pas PowerSync) car roadtrip_members n'est pas dans le schema local.
 *
 * @param {string} roadtripId
 * @returns {{ role: 'OWNER'|'EDITOR'|'VIEWER'|null, isOwner: boolean, canEdit: boolean, canView: boolean, isLoading: boolean }}
 */
export function useRoadtripRole(roadtripId) {
  const token = useAuthStore(s => s.token);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!roadtripId || !token) { setIsLoading(false); return; }
    fetch(`${API_URL}/api/roadtrips/${roadtripId}/members/my-role`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setRole(data?.role ?? null))
      .catch(() => setRole(null))
      .finally(() => setIsLoading(false));
  }, [roadtripId, token]);

  return {
    role,
    isOwner: role === 'OWNER',
    canEdit: role === 'OWNER' || role === 'EDITOR',
    canView: role !== null,
    isLoading,
  };
}
