import { createContext, useContext, useState, useEffect } from 'react';
import { openDB } from 'idb';
import { supabase } from '../lib/supabase';

const OfflineContext = createContext({});

export const useOffline = () => useContext(OfflineContext);

const DB_NAME = 'antarctic-offline';
const DB_VERSION = 1;

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
  const [queuedActions, setQueuedActions] = useState([]);
  const [db, setDb] = useState(null);

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      const database = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Queue store for offline actions
          if (!db.objectStoreNames.contains('queue')) {
            const queueStore = db.createObjectStore('queue', { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            queueStore.createIndex('timestamp', 'timestamp');
            queueStore.createIndex('synced', 'synced');
          }

          // Cache store for read data
          if (!db.objectStoreNames.contains('cache')) {
            const cacheStore = db.createObjectStore('cache', { 
              keyPath: 'key' 
            });
            cacheStore.createIndex('timestamp', 'timestamp');
          }
        },
      });
      setDb(database);
    };

    initDB();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [db]);

  // Load queued actions on mount
  useEffect(() => {
    if (db) {
      loadQueue();
    }
  }, [db]);

  const loadQueue = async () => {
    if (!db) return;
    try {
      const tx = db.transaction('queue', 'readonly');
      const store = tx.objectStore('queue');
      const index = store.index('synced');
      const pending = await index.getAll(0); // Use 0 instead of false
      setQueuedActions(pending || []);
    } catch (err) {
      console.warn('Failed to load queue:', err);
      setQueuedActions([]);
    }
  };

  const queueAction = async (action) => {
    if (!db) {
      console.error('Database not initialized');
      return;
    }

    const queueItem = {
      ...action,
      timestamp: Date.now(),
      synced: false,
    };

    const tx = db.transaction('queue', 'readwrite');
    const id = await tx.store.add(queueItem);
    await tx.done;

    await loadQueue();
    return id;
  };

  const syncQueue = async () => {
    if (!db || !isOnline || syncStatus === 'syncing') return;

    setSyncStatus('syncing');

    try {
      const tx = db.transaction('queue', 'readonly');
      const store = tx.objectStore('queue');
      const index = store.index('synced');
      const pending = await index.getAll(false);

      let successCount = 0;
      let errorCount = 0;

      for (const item of pending) {
        try {
          await executeSyncAction(item);
          
          // Mark as synced
          const updateTx = db.transaction('queue', 'readwrite');
          const updatedItem = { ...item, synced: true, syncedAt: Date.now() };
          await updateTx.store.put(updatedItem);
          await updateTx.done;
          
          successCount++;
        } catch (error) {
          console.error('Sync error for item:', item.id, error);
          errorCount++;
        }
      }

      await loadQueue();
      setSyncStatus(errorCount === 0 ? 'success' : 'error');
      
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync queue error:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const executeSyncAction = async (action) => {
    const { type, table, data, method } = action;

    switch (type) {
      case 'insert':
        const { error: insertError } = await supabase
          .from(table)
          .insert(data);
        if (insertError) throw insertError;
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(table)
          .update(data.updates)
          .eq('id', data.id);
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;

      case 'api':
        // Custom API call
        const response = await fetch(action.url, {
          method: method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(action.headers || {})
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error(`API call failed: ${response.statusText}`);
        }
        break;

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  };

  const cacheData = async (key, data) => {
    if (!db) return;
    
    const tx = db.transaction('cache', 'readwrite');
    await tx.store.put({
      key,
      data,
      timestamp: Date.now()
    });
    await tx.done;
  };

  const getCachedData = async (key) => {
    if (!db) return null;
    
    const tx = db.transaction('cache', 'readonly');
    const cached = await tx.store.get(key);
    return cached?.data;
  };

  const value = {
    isOnline,
    syncStatus,
    queuedActions,
    queueAction,
    syncQueue,
    cacheData,
    getCachedData,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};
