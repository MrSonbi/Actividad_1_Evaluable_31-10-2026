import { inject, InjectionToken } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

import { ENVIRONMENT } from '../config/environment.token';

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
