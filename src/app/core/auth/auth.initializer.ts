import { inject } from '@angular/core';

import { AuthSessionService } from './auth-session.service';
import { AuthStore } from './auth.store';

/**
 * Restaura la sesión de Supabase antes del primer enrutado y deja activa la
 * escucha de cambios de estado (por ejemplo `SIGNED_OUT`).
 */
export function authInitializer(): Promise<void> {
  const store = inject(AuthStore);
  const session = inject(AuthSessionService);

  session.start();
  return store.init();
}
