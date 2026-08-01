import { StartClient } from '@tanstack/react-start/client';
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { registerServiceWorker } from './pwa';

registerServiceWorker();

hydrateRoot(
   document,
   <StrictMode>
      <StartClient />
   </StrictMode>
);
