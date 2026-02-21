import React, { useEffect, useRef } from 'react';
import { PowerSyncContext } from '@powersync/react-native';
import { db } from '../powersync/db';
import { AppConnector } from '../powersync/connector';
import { useAuthStore } from '../store/authStore';

export function AppPowerSyncProvider({ children }) {
  const token = useAuthStore((s) => s.token);
  const connectorRef = useRef(null);

  useEffect(() => {
    if (!token) {
      db.disconnect();
      return;
    }

    const getToken = () => Promise.resolve(token);
    connectorRef.current = new AppConnector(getToken);

    db.connect(connectorRef.current);

    return () => {
      db.disconnect();
    };
  }, [token]);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
