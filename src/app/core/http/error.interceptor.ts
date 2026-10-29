import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthStore } from '../auth/auth.store';

import { toApiError } from './api-error';

/**
 * Normaliza los errores HTTP y gestiona los casos globales: sesión caducada
 * (401) y falta de permisos (403). Los errores de PostgREST (`23505`
 * duplicado, `42501` sin permisos...) se traducen a mensajes amigables.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const store = inject(AuthStore);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const apiError = toApiError(err);

      if (err.status === 401) {
        store.signOut().then(() => router.navigate(['/login'], { queryParams: { sessionExpired: '1' } }));
      } else if (err.status === 403) {
        router.navigate(['/forbidden']);
      }

      return throwError(() => apiError);
    }),
  );
};
