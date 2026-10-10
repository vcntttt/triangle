import { useCallback, useRef, useState } from 'react';

// Runs one async submit at a time. The ref drops repeats fired before React re-renders
// (double Enter, held Ctrl+Enter); `isPending` drives the disabled state of the UI.
export function usePendingAction() {
   const pendingRef = useRef(false);
   const [isPending, setIsPending] = useState(false);

   const run = useCallback(async (action: () => Promise<void>) => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      setIsPending(true);
      try {
         await action();
      } finally {
         pendingRef.current = false;
         setIsPending(false);
      }
   }, []);

   return [isPending, run] as const;
}
