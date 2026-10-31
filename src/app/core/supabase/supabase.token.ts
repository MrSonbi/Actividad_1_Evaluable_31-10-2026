import { inject, InjectionToken } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

import { ENVIRONMENT } from '../config/environment.token';

/**
 * Cliente de Supabase, usado solo para la sesión (Auth) y Realtime.
 *
 * Guarda la sesión y renueva el token automáticamente. Los datos SQL se piden
 * por REST con `HttpClient`.
 */
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT', {
  factory: () => {
    const env = inject(ENVIRONMENT);
    return createClient(env.supabaseUrl, env.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  },
});
