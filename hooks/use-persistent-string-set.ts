import { useCallback, useMemo, useSyncExternalStore, type SetStateAction } from 'react';

const emptySerializedValue = '[]';
const serverSnapshot = emptySerializedValue;

interface PersistentSetStore {
   serializedValue: string;
   listeners: Set<() => void>;
   storageListener?: (event: StorageEvent) => void;
}

const stores = new Map<string, PersistentSetStore>();

function subscribeToHydration() {
   return () => {};
}

function getClientHydrationSnapshot() {
   return true;
}

function getServerHydrationSnapshot() {
   return false;
}

function getStoredValue(storageKey: string) {
   if (typeof window === 'undefined') {
      return emptySerializedValue;
   }

   try {
      return window.localStorage.getItem(storageKey) ?? emptySerializedValue;
   } catch {
      return emptySerializedValue;
   }
}

function getStore(storageKey: string) {
   const existingStore = stores.get(storageKey);

   if (existingStore) {
      return existingStore;
   }

   const store: PersistentSetStore = {
      serializedValue: getStoredValue(storageKey),
      listeners: new Set(),
   };
   stores.set(storageKey, store);

   return store;
}

function notifyStore(store: PersistentSetStore) {
   store.listeners.forEach((listener) => listener());
}

function subscribeToStore(storageKey: string, listener: () => void) {
   const store = getStore(storageKey);
   store.listeners.add(listener);

   if (store.listeners.size === 1 && typeof window !== 'undefined') {
      store.storageListener = (event) => {
         if (event.key !== null && event.key !== storageKey) {
            return;
         }

         const nextSerializedValue = event.newValue ?? emptySerializedValue;

         if (store.serializedValue === nextSerializedValue) {
            return;
         }

         store.serializedValue = nextSerializedValue;
         notifyStore(store);
      };
      window.addEventListener('storage', store.storageListener);
   }

   return () => {
      store.listeners.delete(listener);

      if (store.listeners.size === 0 && store.storageListener && typeof window !== 'undefined') {
         window.removeEventListener('storage', store.storageListener);
         delete store.storageListener;
      }
   };
}

function parseSerializedSet(serializedValue: string) {
   try {
      const parsedValue: unknown = JSON.parse(serializedValue);

      return new Set(
         Array.isArray(parsedValue)
            ? parsedValue.filter((value): value is string => typeof value === 'string')
            : []
      );
   } catch {
      return new Set<string>();
   }
}

export function usePersistentStringSet(storageKey: string) {
   const subscribe = useCallback(
      (listener: () => void) => subscribeToStore(storageKey, listener),
      [storageKey]
   );
   const getSnapshot = useCallback(() => getStore(storageKey).serializedValue, [storageKey]);
   const serializedValue = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
   const values = useMemo(() => parseSerializedSet(serializedValue), [serializedValue]);
   const isReady = useSyncExternalStore(
      subscribeToHydration,
      getClientHydrationSnapshot,
      getServerHydrationSnapshot
   );
   const setValues = useCallback(
      (update: SetStateAction<Set<string>>) => {
         const store = getStore(storageKey);
         const currentValues = parseSerializedSet(store.serializedValue);
         const nextValues = typeof update === 'function' ? update(currentValues) : update;
         const nextSerializedValue = JSON.stringify(Array.from(nextValues));

         store.serializedValue = nextSerializedValue;

         try {
            window.localStorage.setItem(storageKey, nextSerializedValue);
         } catch {
            // Ignorar errores de almacenamiento para no bloquear la vista de issues.
         }

         notifyStore(store);
      },
      [storageKey]
   );

   return [values, setValues, isReady] as const;
}
