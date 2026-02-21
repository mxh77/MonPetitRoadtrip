import { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/react-native';
import API_URL from '../api/config';

/**
 * Connecteur PowerSync — fournit le token JWT à PowerSync
 * et délègue les mutations à notre API Express.
 */
export class AppConnector {
  constructor(getToken) {
    this.getToken = getToken;
  }

  async fetchCredentials() {
    const token = await this.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/api/auth/powersync-token`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Failed to fetch PowerSync token');

    const { token: psToken, powersyncUrl } = await res.json();

    return {
      endpoint: powersyncUrl,
      token: psToken,
    };
  }

  // Les mutations passent toujours par notre API Express REST
  // PowerSync gère uniquement la lecture offline
  async uploadData(database) {
    // Pas de write-back via PowerSync — on utilise l'API Express directement
  }
}
