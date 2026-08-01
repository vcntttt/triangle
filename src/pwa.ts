export function registerServiceWorker() {
   if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
      return;
   }

   window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
         // PWA support is an enhancement; the app remains fully usable without it.
      });
   });
}
