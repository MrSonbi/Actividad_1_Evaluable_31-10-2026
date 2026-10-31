import { InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

/** Configuración de entorno generada por `scripts/set-env.mjs`; es sustituible en tests. */
export const ENVIRONMENT = new InjectionToken<typeof environment>('ENVIRONMENT', {
  providedIn: 'root',
  factory: () => environment,
});
