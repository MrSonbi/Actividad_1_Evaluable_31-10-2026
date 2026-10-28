import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthStore } from '../auth/auth.store';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const store = inject(AuthStore);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        store.signOut().then(() => router.navigate(['/login'], { queryParams: { sessionExpired: '1' } }));
        return throwError(() => err);
      }
      if (err.status === 403) {
        router.navigate(['/forbidden']);
        return throwError(() => err);
      }
      if (err.status === 0) {
        return throwError(() => new Error('Sin conexión a la red'));
      }
      return throwError(() => err);
    }),
  );
};
