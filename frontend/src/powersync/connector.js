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

  // Appelé par PowerSync quand le réseau revient pour syncer les mutations locales
  async uploadData(database) {
    const batch = await database.getCrudBatch(200);
    if (!batch) return;

    const token = await this.getToken();
    if (!token) {
      await batch.cancel();
      return;
    }

    for (const entry of batch.crud) {
      const { op, table, id, opData } = entry;
      const url = `${API_URL}/api/${table}/${id}`;

      try {
        let method, body;
        if (op === 'PUT') {
          method = 'PUT';
          body = JSON.stringify(opData);
        } else if (op === 'PATCH') {
          method = 'PATCH';
          body = JSON.stringify(opData);
        } else if (op === 'DELETE') {
          method = 'DELETE';
        } else {
          continue;
        }

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          ...(body ? { body } : {}),
        });

        // 404 = déjà supprimé côté serveur, on ignore
        if (!res.ok && res.status !== 404) {
          console.warn(`[uploadData] ${method} ${url} → ${res.status}`);
          // Erreur serveur (5xx) ou auth (401/403) → on annule, PowerSync réessaiera
          await batch.cancel();
          return;
        }
      } catch (e) {
        // Erreur réseau — on annule le batch, PowerSync réessaiera plus tard
        await batch.cancel();
        return;
      }
    }

    await batch.complete();
  }
}
