import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';

import { ENVIRONMENT } from '../config/environment.token';
import { SUPABASE_CLIENT } from '../supabase/supabase.token';

import type { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(ENVIRONMENT);
  const supabase = inject(SUPABASE_CLIENT);

  if (!req.url.startsWith(env.supabaseUrl)) {
    return next(req);
  }

  return from(supabase.auth.getSession()).pipe(
    switchMap(({ data }) => {
      const token = data.session?.access_token;
      const headers: Record<string, string> = {
        apikey: env.supabaseKey,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const cloned = req.clone({ setHeaders: headers });
      return next(cloned);
    }),
  );
};
