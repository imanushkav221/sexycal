import { useState, useEffect, useCallback } from "react";
import {
  runSync,
  getSyncStatus,
  addSyncStatusListener,
  type SyncStatus,
} from "@/sync/syncWorker";

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: Date | null;
  sync: () => Promise<void>;
}

export function useSync(): SyncState {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = addSyncStatusListener((newStatus) => {
      setStatus(newStatus);
      if (newStatus === "idle") {
        setLastSyncAt(new Date());
      }
    });
    return unsubscribe;
  }, []);

  const sync = useCallback(async () => {
    await runSync();
  }, []);

  return { status, lastSyncAt, sync };
}
