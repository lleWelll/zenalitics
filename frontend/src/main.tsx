import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setSessionExpiredHandler } from './api';
import { App } from './App';
import { queryClient } from './data/queryClient';
import { router } from './router';
import { createExpireHandler } from './session/expire';

setSessionExpiredHandler(createExpireHandler(() => router.navigate({ to: '/login', search: { expired: true } }), queryClient));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
