import { useEffect, useState } from 'react';

export function usePersistentStringSet(storageKey: string) {
   const [values, setValues] = useState<Set<string>>(() => new Set());
   const [isHydrated, setIsHydrated] = useState(false);

   useEffect(() => {
      try {
         const storedValue = window.localStorage.getItem(storageKey);

         if (storedValue) {
            const parsedValue: unknown = JSON.parse(storedValue);

            if (Array.isArray(parsedValue)) {
               setValues(
                  new Set(parsedValue.filter((value): value is string => typeof value === 'string'))
               );
            }
         }
      } catch {
         // localStorage puede estar deshabilitado o contener datos inválidos.
      } finally {
         setIsHydrated(true);
      }
   }, [storageKey]);

   useEffect(() => {
      if (!isHydrated) {
         return;
      }

      try {
         window.localStorage.setItem(storageKey, JSON.stringify(Array.from(values)));
      } catch {
         // Ignorar errores de almacenamiento para no bloquear la vista de issues.
      }
   }, [isHydrated, storageKey, values]);

   return [values, setValues] as const;
}
